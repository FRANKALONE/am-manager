"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { limitConcurrency } from "@/lib/utils-sync";
import { getNow } from "@/lib/date-utils";
import { getTranslations } from "@/lib/get-translations";
import { formatDate } from "@/lib/date-utils";
import { extractClientJiraId } from "@/lib/ticket-utils";

async function isKillSwitchActive() {
    try {
        const killSwitch = await prisma.parameter.findFirst({
            where: {
                category: 'SYSTEM',
                label: 'SYNC_KILL_SWITCH',
                value: 'true',
                isActive: true
            }
        });
        return !!killSwitch;
    } catch (e) {
        return false;
    }
}

// Extended WorkPackage type with new fields to avoid lint errors
interface ExtendedWorkPackage {
    id: string;
    clientId: string;
    name: string;
    contractType: string | null;
    jiraProjectKeys: string | null;
    hasIaasService: boolean;
    includedTicketTypes: string | null;
    includeEvoEstimates: boolean;
    includeEvoTM: boolean;
    regularizations?: any[];
    validityPeriods?: any[];
}

// Helper function to apply correction model
function applyCorrectionModel(hours: number, wpCorrection: any): number {
    if (!wpCorrection || !wpCorrection.correctionModel) return hours;

    try {
        const config = JSON.parse(wpCorrection.correctionModel.config);

        if (config.type === "TIERED") {
            for (const tier of config.tiers as any[]) {
                if (hours <= tier.max) {
                    if (tier.type === "PASSTHROUGH") {
                        return hours;
                    } else if (tier.type === "ADD") {
                        return hours + tier.value;
                    } else if (tier.type === "FIXED") {
                        return tier.value;
                    }
                }
            }
        }

        return hours; // Fallback if no tier matches
    } catch (error) {
        console.error("Error applying correction model:", error);
        return hours; // Return original hours on error
    }
}

export async function syncWorkPackage(wpId: string, debug: boolean = false, syncDays?: number) {
    let fs: any = null;
    let path: any = null;
    try {
        fs = require('fs');
        path = require('path');
    } catch (e) {
        // Module not available in this environment (e.g. Edge)
    }

    console.log(`[SYNC SERVER] Starting sync for WP: ${wpId} (debug: ${debug})`);
    const https = require('https');

    const debugLogs: string[] = [];
    const addLog = (msg: string) => {
        const logMsg = `[${formatDate(new Date())}] ${msg}`;
        debugLogs.push(logMsg);
        if (debug) console.log(logMsg);

        // Only write to file if fs is available and NOT in Vercel production
        if (fs && path && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            try {
                const logPath = path.join(process.cwd(), 'sync-debug.log');
                fs.appendFileSync(logPath, logMsg + '\n');
            } catch (e) {
                // Silently ignore
            }
        }
        // Also log to regular console for server logging review
        console.log(logMsg);
    };

    try {
        const entryVersion = "v3.2 - 2026-01-15 20:40";
        console.log(`[SYNC ENTRY ${entryVersion}] Starting sync for WP: ${wpId}`);
        addLog(`===== SYNC STARTED: ${wpId} (Version: ${entryVersion}) =====`);

        // 0. Check Kill Switch
        if (await isKillSwitchActive()) {
            addLog(`[CRITICAL] Sync aborted by Kill Switch`);
            const { t } = await getTranslations();
            return { error: t('errors.emergencyStop'), logs: debug ? debugLogs : undefined };
        }

        // 1. Get Work Package with validity periods
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                },
                wpCorrections: {
                    include: {
                        correctionModel: true
                    },
                    orderBy: { startDate: 'desc' }
                },
                regularizations: {
                    orderBy: { date: 'asc' }
                }
            }
        }) as any;

        if (!wp) {
            addLog(`[ERROR] WP not found: ${wpId}`);
            const { t } = await getTranslations();
            return { error: t('errors.notFound', { item: 'Work Package' }), logs: debug ? debugLogs : undefined };
        }

        addLog(`[INFO] WP found: ${wp.id}, Type: ${wp.contractType}`);


        // 2. Only sync for "Bolsa", "BD" (Bolsa Dedicada), and "Eventos" contract types
        const contractType = wp.contractType?.toUpperCase();
        if (contractType !== 'BOLSA' && contractType !== 'BD' && contractType !== 'EVENTOS') {
            addLog(`[INFO] Skipping sync - Contract type not supported: ${wp.contractType}`);
            const { t } = await getTranslations();
            return { success: true, message: t('errors.notApplicable'), processed: 0, totalHours: 0, logs: debug ? debugLogs : undefined };
        }


        // 3. Calculate date range from ALL validity periods
        if (wp.validityPeriods.length === 0) {
            addLog(`[ERROR] No validity periods defined`);
            const { t } = await getTranslations();
            return { error: t('errors.noPeriods'), logs: debug ? debugLogs : undefined };
        }

        // Find earliest start date and latest end date across all periods
        const allStartDates = (wp.validityPeriods as any[]).map((p: any) => new Date(p.startDate).getTime());
        const allEndDates = (wp.validityPeriods as any[]).map((p: any) => new Date(p.endDate).getTime());
        let earliestStart = new Date(Math.min(...allStartDates));
        const latestEnd = new Date(Math.max(...allEndDates));

        if (syncDays && syncDays > 0) {
            const syncCutoff = new Date();
            syncCutoff.setDate(syncCutoff.getDate() - syncDays);
            if (syncCutoff > earliestStart) {
                earliestStart = syncCutoff;
                addLog(`[INFO] Differential sync active: restricting start date to ${earliestStart.toISOString().split('T')[0]} (${syncDays} days)`);
            }
        }

        let totalTicketsSynced = 0;
        let validCount = 0;
        let skippedCount = 0;
        const processedWorklogIds = new Set<number>();

        addLog(`[INFO] Syncing ALL periods: ${earliestStart.toISOString().split('T')[0]} to ${latestEnd.toISOString().split('T')[0]}`);
        addLog(`[INFO] Total validity periods: ${wp.validityPeriods.length}`);

        // Keep 'now' for correction model logic later
        const now = getNow();

        // 4. Collect Tempo Account IDs (current, old, and mappings)
        const accountIdsSet = new Set<string>();

        // Always add current WP ID and its CSE variant as primary candidates
        accountIdsSet.add(wp.id);
        addLog(`[INFO] Adding current ID as candidate: ${wp.id}`);

        if (wp.id.startsWith('AMA')) {
            const cseVariant = wp.id.replace(/^AMA/, 'CSE');
            accountIdsSet.add(cseVariant);
            addLog(`[INFO] Adding CSE variant as candidate: ${cseVariant}`);
        }

        if ((wp as any).tempoAccountId) {
            accountIdsSet.add((wp as any).tempoAccountId);
            addLog(`[INFO] Adding explicit Tempo Account ID: ${(wp as any).tempoAccountId}`);
        }

        if ((wp as any).oldWpId) {
            accountIdsSet.add((wp as any).oldWpId);
            addLog(`[INFO] Adding old WP ID as candidate: ${(wp as any).oldWpId}`);
        }

        const accountIds = Array.from(accountIdsSet);
        if (accountIds.length === 0) {
            // Should not happen now, but as a safety measure
            accountIds.push(wp.id);
        }

        // 5. Fetch worklogs from all matching Tempo accounts (Skip if EVENTOS and no Evolutivos)
        const isEventos = wp.contractType?.toUpperCase() === 'EVENTOS';
        const includeEvoEstimates = (wp as any).includeEvoEstimates ?? true;
        const includeEvoTM = (wp as any).includeEvoTM ?? true;

        let allWorklogs: any[] = [];

        if (isEventos && !includeEvoEstimates && !includeEvoTM) {
            addLog(`[INFO] EVENTOS WP without Evolutivos. Skipping Tempo worklog fetching.`);
        } else {
            const from = earliestStart.toISOString().split('T')[0];
            const to = latestEnd.toISOString().split('T')[0];
            addLog(`[INFO] Fetching worklogs from ${from} to ${to} for ${accountIds.length} account(s)`);
            console.time(`fetch-tempo-worklogs-${wpId}`);

            for (const accountId of accountIds) {
                addLog(`[INFO] Fetching worklogs for account: ${accountId}`);
                let offset = 0;
                const limit = 1000;
                let hasMore = true;

                while (hasMore) {
                    const tempoRes: any = await new Promise((resolve, reject) => {
                        const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=${limit}&offset=${offset}`;
                        const req = https.request(url, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${process.env.TEMPO_API_TOKEN}`,
                                'Accept': 'application/json'
                            }
                        }, (res: any) => {
                            let data = '';
                            res.on('data', (c: any) => data += c);
                            res.on('end', () => {
                                try {
                                    if (data.length === 0) {
                                        addLog(`[ERROR] Empty response from Tempo for ${accountId}`);
                                        resolve({ results: [] });
                                        return;
                                    }
                                    const parsed = JSON.parse(data);
                                    if (res.statusCode !== 200) {
                                        addLog(`[ERROR] Tempo API Error (${res.statusCode}): ${data.substring(0, 200)}`);
                                    }
                                    resolve(parsed);
                                } catch (e) {
                                    addLog(`[ERROR] Failed to parse Tempo response for ${accountId}`);
                                    resolve({ results: [] });
                                }
                            });
                        });
                        req.on('error', (err: any) => {
                            addLog(`[ERROR] Tempo request error: ${err.message}`);
                            resolve({ results: [] });
                        });
                        req.end();
                    });

                    if (tempoRes.results && tempoRes.results.length > 0) {
                        allWorklogs.push(...tempoRes.results);
                        addLog(`[INFO] Fetched ${tempoRes.results.length} worklogs for ${accountId} (offset ${offset})`);
                        hasMore = tempoRes.results.length === limit;
                        offset += limit;
                    } else {
                        hasMore = false;
                    }
                }
            }
        }

        addLog(`[INFO] Total worklogs fetched from all accounts: ${allWorklogs.length}`);
        if (allWorklogs.length > 0) {
            addLog(`[DEBUG] Sample worklog: ${JSON.stringify(allWorklogs[0])}`);
        }

        // 6. Get unique issue IDs and author account IDs
        const uniqueIssueIds = Array.from(new Set(allWorklogs
            .map((log: any) => log.issue?.id)
            .filter(Boolean)
        ));
        const uniqueAuthorIds = Array.from(new Set(allWorklogs.map((log: any) => log.author?.accountId).filter(Boolean)));
        addLog(`[INFO] Fetching details for ${uniqueIssueIds.length} unique issues`);

        // 7. Fetch issue details from Jira (Parallel Batches of 50)
        const issueDetails = new Map<string, any>();
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < uniqueIssueIds.length; i += batchSize) {
            batches.push(uniqueIssueIds.slice(i, i + batchSize));
        }

        if (batches.length > 0) {
            addLog(`[DEBUG] JQL Batches: ${JSON.stringify(batches)}`);
            addLog(`[INFO] Fetching details for ${uniqueIssueIds.length} issues in ${batches.length} parallel batches`);
            console.time(`fetch-jira-issue-details-${wpId}`);

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();
            const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

            const batchTasks = batches.map(batch => async () => {
                const jql = `id IN (${batch.join(',')})`;
                const bodyData = JSON.stringify({
                    jql,
                    maxResults: 100,
                    fields: ['key', 'summary', 'issuetype', 'status', 'priority', 'customfield_10121', 'customfield_10065', 'customfield_10064', 'customfield_10353', 'customfield_10176', 'customfield_10851', 'created', 'components', 'reporter']
                });

                try {
                    const jiraRes: any = await new Promise((resolve, reject) => {
                        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'Content-Type': 'application/json'
                            }
                        }, (res: any) => {
                            let data = '';
                            res.on('data', (c: any) => data += c);
                            res.on('end', () => {
                                try {
                                    if (res.statusCode === 200) {
                                        resolve(JSON.parse(data));
                                    } else {
                                        resolve({ issues: [] });
                                    }
                                } catch (e) {
                                    resolve({ issues: [] });
                                }
                            });
                        });
                        req.on('error', (err: any) => resolve({ issues: [] }));
                        req.write(bodyData);
                        req.end();
                    });

                    if (jiraRes.issues) {
                        jiraRes.issues.forEach((issue: any) => {
                            const billingModeRaw = issue.fields.customfield_10121;
                            const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || null;

                            const getSlaInfo = (field: any) => {
                                if (!field) return { status: null, time: null };

                                let status = null;
                                let elapsed = null;

                                if (field.ongoingCycle) {
                                    elapsed = field.ongoingCycle.elapsedTime?.friendly || null;
                                    if (field.ongoingCycle.breached) {
                                        status = "Incumplido";
                                    } else {
                                        status = field.ongoingCycle.remainingTime?.friendly || "En plazo";
                                    }
                                } else if (field.completedCycles && field.completedCycles.length > 0) {
                                    const last = field.completedCycles[field.completedCycles.length - 1];
                                    elapsed = last.elapsedTime?.friendly || null;
                                    status = last.breached ? "Incumplido" : "Cumplido";
                                }

                                return { status, time: elapsed };
                            };

                            const resSla = getSlaInfo(issue.fields.customfield_10065);
                            const resolSla = getSlaInfo(issue.fields.customfield_10064);

                            const componentsRaw = issue.fields.components || [];
                            const component = componentsRaw.length > 0 ? componentsRaw[0].name : null;

                            // Extract client JIRA ID for FAIN, MOLECOR, UAX
                            const projectKey = issue.key.split('-')[0];
                            const clientJiraId = extractClientJiraId(issue.fields, projectKey);

                            issueDetails.set(issue.id, {
                                key: issue.key,
                                summary: issue.fields.summary || '',
                                issueType: issue.fields.issuetype?.name,
                                status: issue.fields.status?.name || 'Unknown',
                                priority: issue.fields.priority?.name || 'Media',
                                billingMode: billingMode,
                                created: issue.fields.created,
                                slaResponse: resSla.status,
                                slaResponseTime: resSla.time,
                                slaResolution: resolSla.status,
                                slaResolutionTime: resolSla.time,
                                component: component,
                                reporter: issue.fields.reporter?.displayName || 'Unknown',
                                clientJiraId: clientJiraId
                            });
                        });
                    }
                } catch (e) { }
            });

            await limitConcurrency(batchTasks, 3);
            console.timeEnd(`fetch-jira-issue-details-${wpId}`);
        }

        addLog(`[INFO] Fetched details for ${issueDetails.size} issues`);

        const authorNames = new Map<string, string>();
        addLog(`[INFO] Fetching user details for ${uniqueAuthorIds.length} authors (Parallel)`);

        const jiraUrl = process.env.JIRA_URL?.trim();
        const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
        const jiraToken = process.env.JIRA_API_TOKEN?.trim();
        const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

        const userTasks = uniqueAuthorIds.map(accountId => async () => {
            try {
                const userRes: any = await new Promise((resolve, reject) => {
                    const req = https.request(`${jiraUrl}/rest/api/3/user?accountId=${accountId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'application/json'
                        }
                    }, (res: any) => {
                        let data = '';
                        res.on('data', (c: any) => data += c);
                        res.on('end', () => {
                            try {
                                if (res.statusCode === 200) {
                                    resolve(JSON.parse(data));
                                } else {
                                    resolve(null);
                                }
                            } catch (e) {
                                resolve(null);
                            }
                        });
                    });
                    req.on('error', (err: any) => resolve(null));
                    req.end();
                });

                if (userRes && userRes.displayName) {
                    authorNames.set(accountId, userRes.displayName);
                }
            } catch (error: any) {
                // Ignore individual user fetch errors
            }
        });

        await limitConcurrency(userTasks, 5);

        addLog(`[INFO] Fetched ${authorNames.size} author names`);

        // 7.6. Fetch Evolutivos with "Bolsa de Horas" or "T&M contra bolsa" billing mode
        const evolutivoEstimates: any[] = [];
        const tmEvolutivoIds = new Set<string>(); // Keep track of T&M ticket IDs to fetch worklogs later
        const tmBolsaEvolutivoIds = new Set<string>(); // Specifically those that consume Bolsa
        const ticketIdToKey = new Map<string, string>(); // Helper to resolve key from ID

        if (wp.jiraProjectKeys) {
            const projectKeys = (wp as any).jiraProjectKeys.split(',').map((k: any) => k.trim()).filter(Boolean);
            if (projectKeys.length > 0) {
                addLog(`[INFO] Fetching Evolutivos with Bolsa de Horas or T&M contra bolsa for projects: ${projectKeys.join(', ')}`);

                const includeEvoEstimates = (wp as any).includeEvoEstimates ?? true;
                const includeEvoTM = (wp as any).includeEvoTM ?? true;

                addLog(`[INFO] Config: includeEvoEstimates=${includeEvoEstimates}, includeEvoTM=${includeEvoTM}`);

                if (!includeEvoEstimates && !includeEvoTM) {
                    addLog(`[INFO] Both Evolutivo types disabled for this WP. Skipping Jira search.`);
                } else {
                    // Fetch Evolutivos project-wide as requested by the user.
                    // We stick to the "Evolutivo" type and relevant billing modes.
                    // accountIds contains wp.id, CSE variant, oldWpId and tempoAccountId, but we now "obviar el WP" (ignore account) 
                    // to ensure all relevant hours are captured project-wide.
                    // Standardize JQL using field IDs for robustness
                    let jql = `project IN (${projectKeys.join(',')}) AND issuetype = "Evolutivo" AND (cf[10121] IN ("Bolsa de Horas", "T&M contra bolsa", "T&M Facturable", "T&M facturable", "Facturable", "facturable") OR cf[10121] IS EMPTY)`;

                    if (syncDays && syncDays > 0) {
                        jql += ` AND updated >= "-${syncDays}d"`;
                        addLog(`[INFO] Restricting Evolutivo search to updated in last ${syncDays} days`);
                    }

                    const jiraUrl = process.env.JIRA_URL?.trim();
                    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
                    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
                    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

                    // Fetch all Evolutivos with pagination
                    let nextPageToken: string | null = null;
                    const maxResults = 100;
                    let hasMore = true;
                    const allEvolutivos: any[] = [];

                    addLog(`[INFO] Starting paginated fetch of Evolutivos (Token-based)...`);

                    while (hasMore) {
                        const bodyData = JSON.stringify({
                            jql,
                            maxResults,
                            nextPageToken,
                            // Include SLA fields in initial query for optimization
                            fields: ['key', 'summary', 'created', 'timeoriginalestimate', 'customfield_10121', 'customfield_10065', 'customfield_10064', 'customfield_10353', 'customfield_10176', 'customfield_10851', 'status', 'issuetype', 'assignee', 'duedate', 'parent', 'priority', 'components', 'reporter']
                        });

                        const evolutivosRes: any = await new Promise((resolve, reject) => {
                            const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Basic ${auth}`,
                                    'Content-Type': 'application/json'
                                }
                            }, (res: any) => {
                                let data = '';
                                res.on('data', (c: any) => data += c);
                                res.on('end', () => {
                                    try {
                                        if (res.statusCode === 200) {
                                            resolve(JSON.parse(data));
                                        } else {
                                            addLog(`[WARN] Failed to fetch Evolutivos: ${res.statusCode}. Response: ${data.substring(0, 200)}`);
                                            resolve({ issues: [], isLast: true });
                                        }
                                    } catch (e) {
                                        addLog(`[ERROR] Failed to parse Evolutivos response`);
                                        resolve({ issues: [], isLast: true });
                                    }
                                });
                            });
                            req.on('error', (err: any) => {
                                addLog(`[ERROR] Evolutivos request error: ${err.message}`);
                                resolve({ issues: [], isLast: true });
                            });
                            req.write(bodyData);
                            req.end();
                        });

                        if (evolutivosRes.issues && evolutivosRes.issues.length > 0) {
                            allEvolutivos.push(...evolutivosRes.issues);
                            addLog(`[INFO] Fetched ${evolutivosRes.issues.length} Evolutivos (Total so far: ${allEvolutivos.length})`);

                            nextPageToken = evolutivosRes.nextPageToken || null;
                            hasMore = !evolutivosRes.isLast && !!nextPageToken;
                        } else {
                            hasMore = false;
                        }
                    }

                    addLog(`[INFO] Completed paginated fetch: ${allEvolutivos.length} total Evolutivos found`);

                    if (allEvolutivos.length > 0) {
                        addLog(`[INFO] Processing ${allEvolutivos.length} Evolutivos with SLA data`);
                        console.time(`fetch-evolutivos-logic-${wpId}`);

                        allEvolutivos.forEach((issue: any) => {
                            const billingModeRaw = issue.fields.customfield_10121;
                            const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || 'Bolsa de Horas';

                            const billingModeLower = billingMode.toLowerCase();
                            const isTM = billingModeLower === 't&m contra bolsa';
                            const isTMFacturable = billingModeLower === 't&m facturable' || billingModeLower === 'facturable';
                            const isBolsa = billingMode === 'Bolsa de Horas';

                            // Check permissions
                            if ((isTM || isTMFacturable) && !includeEvoTM) return;
                            if (isBolsa && !includeEvoEstimates) return;

                            if (isTM || isTMFacturable) {
                                tmEvolutivoIds.add(issue.id);
                                if (isTM) tmBolsaEvolutivoIds.add(issue.id);
                                ticketIdToKey.set(issue.id, issue.key);
                                addLog(`[INFO] Identified T&M Evolutivo for worklog sync: ${issue.key} (ID: ${issue.id}, Mode: ${billingMode})`);
                            }

                            // Extract SLA information
                            const getSlaInfo = (field: any) => {
                                if (!field) return { status: null, time: null };

                                let status = null;
                                let elapsed = null;

                                if (field.ongoingCycle) {
                                    elapsed = field.ongoingCycle.elapsedTime?.friendly || null;
                                    if (field.ongoingCycle.breached) {
                                        status = "Incumplido";
                                    } else {
                                        status = field.ongoingCycle.remainingTime?.friendly || "En plazo";
                                    }
                                } else if (field.completedCycles && field.completedCycles.length > 0) {
                                    const last = field.completedCycles[field.completedCycles.length - 1];
                                    elapsed = last.elapsedTime?.friendly || null;
                                    status = last.breached ? "Incumplido" : "Cumplido";
                                }

                                return { status, time: elapsed };
                            };

                            const resSla = getSlaInfo(issue.fields.customfield_10065);
                            const resolSla = getSlaInfo(issue.fields.customfield_10064);

                            const componentsRaw = issue.fields.components || [];
                            const component = componentsRaw.length > 0 ? componentsRaw[0].name : null;

                            // Extract client JIRA ID for FAIN, MOLECOR, UAX
                            const projectKey = issue.key.split('-')[0];
                            const clientJiraId = extractClientJiraId(issue.fields, projectKey);

                            issueDetails.set(issue.id, {
                                id: issue.id,
                                key: issue.key,
                                summary: issue.fields.summary,
                                issueType: issue.fields.issuetype?.name || 'Evolutivo',
                                billingMode: billingMode,
                                created: issue.fields.created,
                                estimate: issue.fields.timeoriginalestimate,
                                status: issue.fields.status?.name || 'Unknown',
                                priority: issue.fields.priority?.name || 'Media',
                                assignee: issue.fields.assignee?.displayName || null,
                                dueDate: issue.fields.duedate || null,
                                parentKey: issue.fields.parent?.key || null,
                                slaResponse: resSla.status,
                                slaResponseTime: resSla.time,
                                slaResolution: resolSla.status,
                                slaResolutionTime: resolSla.time,
                                component: component,
                                reporter: issue.fields.reporter?.displayName || 'Unknown',
                                clientJiraId: clientJiraId
                            });

                            if (isBolsa && issue.fields.timeoriginalestimate) {
                                const createdDate = new Date(issue.fields.created);
                                const year = createdDate.getFullYear();
                                const month = createdDate.getMonth() + 1;
                                const hours = issue.fields.timeoriginalestimate / 3600;

                                evolutivoEstimates.push({
                                    issueKey: issue.key || null, // Ensure not undefined
                                    issueSummary: issue.fields.summary || '',
                                    estimatedHours: hours,
                                    createdDate,
                                    year,
                                    month
                                });

                                addLog(`[INFO] Evolutivo ${issue.key}: ${hours}h estimated (created ${year}-${String(month).padStart(2, '0')})`);
                            }
                        });
                    } else {
                        addLog(`[INFO] No Evolutivos with Bolsa de Horas or T&M contra bolsa found`);
                    }
                }
            }
        }

        // 7.7. Fetch worklogs for T&M Evolutivos from Tempo (Parallelized)
        const tmWorklogs: any[] = [];
        const tmTicketIds = Array.from(tmEvolutivoIds);

        if (tmTicketIds.length > 0) {
            addLog(`[INFO] Fetching universal worklogs for ${tmTicketIds.length} T&M tickets (Parallel)`);

            const tempoTasks = tmTicketIds.map(ticketId => async () => {
                const ticketKey = ticketIdToKey.get(ticketId) || ticketId;
                try {
                    let offset = 0;
                    const limit = 500;
                    let hasMore = true;

                    while (hasMore) {
                        const tempoRes: any = await new Promise((resolve, reject) => {
                            const url = `https://api.tempo.io/4/worklogs/issue/${ticketId}?limit=${limit}&offset=${offset}`;
                            const req = https.request(url, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${process.env.TEMPO_API_TOKEN}`,
                                    'Accept': 'application/json'
                                }
                            }, (res: any) => {
                                let data = '';
                                res.on('data', (c: any) => data += c);
                                res.on('end', () => {
                                    try {
                                        if (res.statusCode === 200) {
                                            resolve(JSON.parse(data));
                                        } else {
                                            resolve({ results: [] });
                                        }
                                    } catch (e) {
                                        resolve({ results: [] });
                                    }
                                });
                            });
                            req.on('error', (err: any) => resolve({ results: [] }));
                            req.end();
                        });

                        if (tempoRes.results && tempoRes.results.length > 0) {
                            tmWorklogs.push(...tempoRes.results);
                            hasMore = tempoRes.results.length === limit;
                            offset += limit;
                        } else {
                            hasMore = false;
                        }
                    }
                } catch (error) {
                    // Ignore individual fetch errors
                }
            });

            await limitConcurrency(tempoTasks, 5);
        }

        // 8. Load valid ticket types from WP configuration
        let validTypes: string[] = [];
        if ((wp as any).includedTicketTypes) {
            validTypes = (wp as any).includedTicketTypes.split(',').map((t: string) => t.trim()).filter(Boolean);
            addLog(`[INFO] Valid ticket types for this WP: ${validTypes.join(', ')}`);
        } else {
            addLog(`[WARN] No ticket types configured for this Work Package specifically.`);
        }

        if (validTypes.length === 0) {
            addLog(`[WARN] No valid ticket types found! No worklogs will be processed.`);
        }

        // 8.5. Find active correction model (before loop)
        let activeCorrection = (wp as any).wpCorrections.find((c: any) => {
            const corrStart = new Date(c.startDate);
            // End date is inclusive of the entire day
            const corrEnd = c.endDate ? new Date(c.endDate) : new Date('2099-12-31');
            corrEnd.setHours(23, 59, 59, 999);
            return now >= corrStart && now <= corrEnd;
        });

        // If no WP-specific correction, use the default model from the system
        if (!activeCorrection) {
            const defaultModel = await prisma.correctionModel.findFirst({
                where: { isDefault: true }
            });

            if (defaultModel) {
                // Create a virtual correction object with the default model
                activeCorrection = {
                    correctionModel: defaultModel
                } as any;
                addLog(`[INFO] No WP-specific correction, using default model: ${defaultModel.name}`);
            } else {
                addLog(`[INFO] No active correction model and no default found, using raw hours`);
            }
        } else {
            addLog(`[INFO] Using WP-specific correction model: ${activeCorrection.correctionModel.name}`);
        }

        addLog(`[INFO] Filter candidates: ${accountIds.join(', ')}`);
        addLog(`[INFO] Total raw worklogs fetched from accounts: ${allWorklogs.length}`);

        const monthlyHours = new Map<string, number>();
        const worklogDetailsToSave: any[] = []; // Collect worklog details
        processedWorklogIds.clear(); // Re-use the set if needed or just clear it
        validCount = 0;
        skippedCount = 0;

        // Process combined worklogs (Account logs + T&M specific logs)
        const combinedWorklogs = [...allWorklogs, ...tmWorklogs];
        addLog(`[INFO] Processing ${combinedWorklogs.length} total worklogs (${allWorklogs.length} from accounts + ${tmWorklogs.length} from T&M)`);

        // 8.8. Fetch missing issue details for T&M worklogs not in allWorklogs
        const combinedIssueIds = Array.from(new Set(combinedWorklogs
            .map((log: any) => log.issue?.id)
            .filter(Boolean)
        ));
        const missingIssueIds = combinedIssueIds.filter(id => !issueDetails.has(String(id)));

        if (missingIssueIds.length > 0) {
            addLog(`[INFO] Fetching details for ${missingIssueIds.length} additional issues from T&M worklogs`);

            const missingBatches = [];
            const batchSize = 50;
            for (let i = 0; i < missingIssueIds.length; i += batchSize) {
                missingBatches.push(missingIssueIds.slice(i, i + batchSize));
            }

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();
            const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

            const missingBatchTasks = missingBatches.map(batch => async () => {
                const jql = `id IN (${batch.join(',')})`;
                const bodyData = JSON.stringify({
                    jql,
                    maxResults: 100,
                    fields: ['key', 'summary', 'issuetype', 'status', 'priority', 'customfield_10121', 'customfield_10065', 'customfield_10064', 'customfield_10353', 'customfield_10176', 'customfield_10851', 'created', 'components', 'reporter']
                });

                try {
                    const jiraRes: any = await new Promise((resolve, reject) => {
                        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'Content-Type': 'application/json'
                            }
                        }, (res: any) => {
                            let data = '';
                            res.on('data', (c: any) => data += c);
                            res.on('end', () => {
                                try {
                                    if (res.statusCode === 200) {
                                        resolve(JSON.parse(data));
                                    } else {
                                        resolve({ issues: [] });
                                    }
                                } catch (e) {
                                    resolve({ issues: [] });
                                }
                            });
                        });
                        req.on('error', (err: any) => resolve({ issues: [] }));
                        req.write(bodyData);
                        req.end();
                    });

                    if (jiraRes.issues) {
                        jiraRes.issues.forEach((issue: any) => {
                            const billingModeRaw = issue.fields.customfield_10121;
                            const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || null;

                            const getSlaInfo = (field: any) => {
                                if (!field) return { status: null, time: null };

                                let status = null;
                                let elapsed = null;

                                if (field.ongoingCycle) {
                                    elapsed = field.ongoingCycle.elapsedTime?.friendly || null;
                                    if (field.ongoingCycle.breached) {
                                        status = "Incumplido";
                                    } else {
                                        status = field.ongoingCycle.remainingTime?.friendly || "En plazo";
                                    }
                                } else if (field.completedCycles && field.completedCycles.length > 0) {
                                    const last = field.completedCycles[field.completedCycles.length - 1];
                                    elapsed = last.elapsedTime?.friendly || null;
                                    status = last.breached ? "Incumplido" : "Cumplido";
                                }

                                return { status, time: elapsed };
                            };

                            const resSla = getSlaInfo(issue.fields.customfield_10065);
                            const resolSla = getSlaInfo(issue.fields.customfield_10064);

                            const componentsRaw = issue.fields.components || [];
                            const component = componentsRaw.length > 0 ? componentsRaw[0].name : null;

                            // Extract client JIRA ID for FAIN, MOLECOR, UAX
                            const projectKey = issue.key.split('-')[0];
                            const clientJiraId = extractClientJiraId(issue.fields, projectKey);

                            issueDetails.set(issue.id, {
                                key: issue.key,
                                summary: issue.fields.summary || '',
                                issueType: issue.fields.issuetype?.name,
                                status: issue.fields.status?.name || 'Unknown',
                                priority: issue.fields.priority?.name || 'Media',
                                billingMode: billingMode,
                                created: issue.fields.created,
                                slaResponse: resSla.status,
                                slaResponseTime: resSla.time,
                                slaResolution: resolSla.status,
                                slaResolutionTime: resolSla.time,
                                component: component,
                                reporter: issue.fields.reporter?.displayName || 'Unknown',
                                clientJiraId: clientJiraId
                            });
                        });
                    }
                } catch (e) { }
            });

            await limitConcurrency(missingBatchTasks, 3);
            console.timeEnd(`fetch-missing-issue-details-${wpId}`);
            addLog(`[INFO] Total issue details now: ${issueDetails.size}`);
        }


        let firstLog = true;
        addLog(`[INFO] Processing ${combinedWorklogs.length} total worklogs (${allWorklogs.length} from accounts + ${tmWorklogs.length} from T&M)`);
        console.time(`process-combined-worklogs-${wpId}`);
        for (const log of combinedWorklogs) {
            const issueId = log.issue?.id ? String(log.issue.id) : null;
            const details = issueId ? issueDetails.get(issueId) : null;

            // DEBUG: Log the first few worklogs to see structure
            if (firstLog) {
                addLog(`[DEBUG] First worklog sample:`);
                addLog(`[DEBUG] log.issue = ${JSON.stringify(log.issue)}`);
                addLog(`[DEBUG] details = ${JSON.stringify(details)}`);
                firstLog = false;
            }

            if (!details) {
                const logKey = log.issue?.key || log.issue?.id || 'Unknown';
                addLog(`[WARN] Missing Jira details for ${logKey} (ID: ${issueId}) - this ticket will be skipped`);
                addLog(`[FILTER] Skipped ${logKey}: No Jira details found for ID ${issueId}`);
                skippedCount++;
                continue;
            }

            // Defensive check for missing issueType
            if (!details.issueType) {
                addLog(`[WARN] Missing issueType for ${details.key || 'unknown'} - this indicates incomplete Jira data`);
            }

            // Check if valid (normalize both sides for comparison)
            const issueType = details.issueType || 'Unknown';
            const issueTypeLower = issueType.toLowerCase().trim();
            const isValidType = validTypes.some(vt => vt.toLowerCase().trim() === issueTypeLower);

            // Special rules for Evolutivos and IAAS are now largely covered by explicit config, 
            // but we keep the logic for backward compatibility/extra safety
            const billingModeLower = details.billingMode ? details.billingMode.toLowerCase() : '';
            const isEvolutivoTM = (issueType === 'Evolutivo' && (billingModeLower === 't&m contra bolsa' || billingModeLower === 'bolsa de horas') && (wp.includeEvoTM ?? true));
            const isEvolutivoTMFacturable = (issueType === 'Evolutivo' && (billingModeLower === 't&m facturable' || billingModeLower === 'facturable') && (wp.includeEvoTM ?? true));
            const isEvolutivoBolsa = (issueType === 'Evolutivo' && (billingModeLower === 'bolsa de horas' || !details.billingMode) && (wp.includeEvoEstimates ?? true));

            // IAAS is now usually in the includedTicketTypes list, but we keep this as a secondary check
            const isIaasService = wp.hasIaasService && (issueTypeLower === 'servicio iaas' || issueTypeLower === 'iaas');

            if (isEvolutivoBolsa) {
                addLog(`[FILTER] Skipped worklog for ${details.key}: Evolutivo Bolsa always uses estimate.`);
                skippedCount++;
                continue;
            }

            const isValid = isValidType || isEvolutivoTM || isEvolutivoTMFacturable || isIaasService;

            // Debug log for Evolutivos
            if (issueType === 'Evolutivo') {
                addLog(`[DEBUG] Processing Evolutivo ${details.key}: billingMode="${details.billingMode}", isTM=${isEvolutivoTM}, isTMFact=${isEvolutivoTMFacturable}, isValid=${isValid}`);
            }

            if (!isValid) {
                const billingModeStr = typeof details.billingMode === 'object'
                    ? JSON.stringify(details.billingMode)
                    : (details.billingMode || 'N/A');
                addLog(`[FILTER] Skipped ${details.key}: Type "${issueType}" is NOT in valid list for this WP. Billing: ${billingModeStr}`);
                skippedCount++;
                continue;
            }


            // Deduplication Check - Use tempoWorklogId instead of id
            const worklogId = log.tempoWorklogId || log.id;
            if (processedWorklogIds.has(worklogId)) {
                addLog(`[DEDUPE] Already processed worklog ${worklogId} for ${details.key}`);
                continue;
            }
            processedWorklogIds.add(worklogId);

            validCount++;

            // Calculate raw hours
            const date = new Date(log.startDate);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const rawHours = log.timeSpentSeconds / 3600;

            // Apply correction model per worklog
            const correctedHours = applyCorrectionModel(rawHours, activeCorrection);

            const key = `${year}-${String(month).padStart(2, '0')}`;

            // POINT 3: Only add to monthlyHours (Bolsa consumption) if NOT a separate T&M Facturable ticket
            if (!isEvolutivoTMFacturable) {
                monthlyHours.set(key, (monthlyHours.get(key) || 0) + correctedHours);
            } else {
                addLog(`[INFO] Evolutivo T&M Facturable: ${correctedHours.toFixed(2)}h in ${key} (${details.key}) - EXCLUDED from Bolsa consumption`);
            }

            // Normalize tipoImputacion values (Tempo sometimes returns values without spaces)
            const normalizeTipoImputacion = (value: string | null | undefined): string | null => {
                if (!value) return null;

                // Map of known malformed values to correct ones
                const normalizations: Record<string, string> = {
                    'Analisisinicial': 'Analisis inicial',
                    'AnalisisNivel1': 'Analisis Nivel 1',
                    'AnalisisNivel2': 'Analisis Nivel 2',
                    'ResolucionNivel1': 'Resolucion Nivel 1',
                    'ResolucionNivel2': 'Resolucion Nivel 2',
                    'PropuestadeSolucion': 'Propuesta de Solucion',
                    'Desarrollos': 'Desarrollos',
                    'Configuraciones': 'Configuraciones',
                    'Transportes': 'Transportes',
                    'Pruebas': 'Pruebas',
                    'Documentacion': 'Documentacion',
                    'Reunion': 'Reunion',
                    'Gestion': 'Gestion',
                    'Presupuesto': 'Presupuesto'
                };

                // Return normalized value or original if not in map
                return normalizations[value] || value;
            };

            // Extract Tipo Imputación from Tempo work attributes
            const rawTipoImputacion = log.attributes?.values?.find((attr: any) =>
                attr.key === '_TipoImputación_'
            )?.value || null;

            const tipoImputacion = normalizeTipoImputacion(rawTipoImputacion);

            // Determine which WP to save this worklog to
            // ALL worklogs (including T&M Evolutivos) go to the main WP being synced
            // T&M Evolutivos charge against the main WP's consumption
            const targetWpId = wp.id;
            const accountKey = log.account?.key || log.account?.id;

            // Log if this is a T&M Evolutivo from a different account
            const isEvolutivoTMRecord = Array.from(tmEvolutivoIds).some(id => ticketIdToKey.get(id) === details.key);
            if (details.issueType === 'Evolutivo' && isEvolutivoTMRecord) {
                if (accountKey && accountKey !== wp.id) {
                    addLog(`[T&M-EVOLUTIVO] ${details.key}: ${correctedHours.toFixed(2)}h from account ${accountKey} → charging to main WP ${wp.id}`);
                }
            }

            // Save worklog detail for monthly breakdown
            worklogDetailsToSave.push({
                workPackageId: targetWpId,
                year,
                month,
                issueKey: details.key || null,  // Use key from Jira details, ensure not undefined
                issueType: details.issueType || 'Unknown',  // Fallback for missing type
                issueSummary: details.summary || '',
                issueCreatedDate: details.created ? new Date(details.created) : null,
                timeSpentHours: correctedHours,
                startDate: new Date(log.startDate),
                author: authorNames.get(log.author?.accountId) || log.author?.accountId || 'Unknown',
                tipoImputacion,
                originWpId: accountKey || null,
                billingMode: details?.billingMode || null
            });

            if (rawHours !== correctedHours) {
                addLog(`[CORRECTION] ${rawHours.toFixed(2)}h -> ${correctedHours.toFixed(2)}h`);
            }
        }
        console.timeEnd(`process-combined-worklogs-${wpId}`);

        addLog(`[INFO] Filtered: ${validCount} valid, ${skippedCount} skipped`);

        // 8.6. Add Evolutivo estimates to monthly consumption
        evolutivoEstimates.forEach(evo => {
            const key = `${evo.year}-${String(evo.month).padStart(2, '0')}`;
            monthlyHours.set(key, (monthlyHours.get(key) || 0) + evo.estimatedHours);

            // Add to worklog details for display
            worklogDetailsToSave.push({
                workPackageId: wp.id,
                year: evo.year,
                month: evo.month,
                issueKey: evo.issueKey,
                issueType: 'Evolutivo',
                issueSummary: evo.issueSummary,
                issueCreatedDate: evo.createdDate, // Add creation date
                timeSpentHours: evo.estimatedHours,
                startDate: evo.createdDate,
                author: 'Estimación',
                tipoImputacion: 'Evolutivo Bolsa',
                billingMode: 'Bolsa de Horas'
            });
        });

        if (evolutivoEstimates.length > 0) {
            addLog(`[INFO] Added ${evolutivoEstimates.length} Evolutivo estimates to consumption`);
        }

        // 8.7. Process regularizations
        console.time(`process-regularizations-${wpId}`);
        // - MANUAL_CONSUMPTION: Add to consumed hours
        // - EXCESS/RETURN: Keep separate (regularization column)
        if (wp.regularizations && wp.regularizations.length > 0) {
            addLog(`[INFO] Processing ${wp.regularizations.length} regularizations`);

            (wp as any).regularizations.forEach((reg: any) => {
                const regDate = new Date(reg.date);
                const year = regDate.getFullYear();
                const month = regDate.getMonth() + 1;
                const key = `${year}-${String(month).padStart(2, '0')}`;


                if (reg.type === 'MANUAL_CONSUMPTION') {
                    // Add manual consumption to consumed hours
                    const currentHours = monthlyHours.get(key) || 0;
                    monthlyHours.set(key, currentHours + reg.quantity);

                    addLog(`[INFO] Manual Consumption: +${reg.quantity}h in ${key} (${reg.ticketId || 'N/A'}) - Type: ${(reg as any).ticketType || 'Evolutivo'}`);

                    // If ticketId is provided, try to fetch real ticket data from Jira
                    let ticketData: any = null;
                    if (reg.ticketId && reg.ticketId.includes('-')) {
                        try {
                            const jiraUrl = process.env.JIRA_URL?.trim();
                            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
                            const jiraToken = process.env.JIRA_API_TOKEN?.trim();

                            if (jiraUrl && jiraEmail && jiraToken) {
                                const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
                                const issueLookupUrl = new URL(`${jiraUrl}/rest/api/3/issue/${reg.ticketId}`);
                                const jiraRes: any = new Promise((resolve, reject) => {
                                    const req = https.request({
                                        hostname: issueLookupUrl.hostname,
                                        port: 443,
                                        path: issueLookupUrl.pathname + issueLookupUrl.search,
                                        method: 'GET',
                                        headers: {
                                            'Authorization': `Basic ${auth}`,
                                            'Accept': 'application/json'
                                        }
                                    }, (res: any) => {
                                        let data = '';
                                        res.on('data', (chunk: any) => data += chunk);
                                        res.on('end', () => {
                                            try {
                                                resolve(JSON.parse(data));
                                            } catch (e) {
                                                addLog(`[ERROR] Failed to parse JIRA response for ${reg.ticketId}: ${e}`);
                                                resolve({ issues: [] });
                                            }
                                        });
                                    });
                                    req.on('error', (err: any) => {
                                        addLog(`[ERROR] JIRA request failed for ${reg.ticketId}: ${err.message}`);
                                        resolve({ issues: [] });
                                    });
                                    req.end();
                                });

                                if (jiraRes && !jiraRes.errorMessages) {
                                    ticketData = {
                                        summary: jiraRes.fields.summary,
                                        status: jiraRes.fields.status?.name,
                                        createdDate: new Date(jiraRes.fields.created)
                                    };
                                    addLog(`[INFO] Fetched Jira data for ${reg.ticketId}: ${ticketData.status}`);
                                } else if (jiraRes.errorMessages) {
                                    addLog(`[WARN] Jira API error for ${reg.ticketId}: ${JSON.stringify(jiraRes.errorMessages)}`);
                                }
                            }
                        } catch (error) {
                            addLog(`[WARN] Could not fetch Jira data for ${reg.ticketId}: ${error}`);
                        }
                    }

                    // Add to worklog details for display
                    // Use ticketType if specified, otherwise fallback to 'Evolutivo' (default behavior)
                    worklogDetailsToSave.push({
                        workPackageId: wp.id,
                        year,
                        month,
                        issueKey: reg.ticketId || `MANUAL-${reg.id}`,
                        issueType: (reg as any).ticketType || 'Evolutivo',
                        issueSummary: ticketData?.summary || reg.description || `Consumo manual ${reg.id}`,
                        issueCreatedDate: ticketData?.createdDate || regDate,
                        timeSpentHours: reg.quantity,
                        startDate: regDate,
                        author: (reg as any).createdByName || 'Sistema',
                        tipoImputacion: 'Consumo Manual'
                    });
                } else if (reg.type === 'EXCESS' || reg.type === 'RETURN' || reg.type === 'SOBRANTE_ANTERIOR') {
                    // DON'T subtract from consumption - regularizations are separate!
                    // const currentHours = monthlyHours.get(key) || 0;
                    // monthlyHours.set(key, currentHours - reg.quantity);

                    addLog(`[INFO] Regularization ${reg.type}: ${reg.type === 'RETURN' ? '-' : '+'}${reg.quantity}h in ${key} (${reg.description || 'N/A'})`);

                    // DON'T add to worklog details - regularizations are calculated separately in dashboard
                }
            });
        }
        console.timeEnd(`process-regularizations-${wpId}`);

        // 8.5. For Events WP: Fetch ALL tickets from project using JIRA API v3
        if (wp.contractType?.toUpperCase() === 'EVENTOS') {
            console.time(`process-events-${wpId}`);
            console.log('[EVENTS DEBUG] Entering Events sync section');
            addLog(`[INFO] Fetching all tickets for Events WP...`);

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();

            if (!jiraUrl || !jiraEmail || !jiraToken) {
                addLog(`[ERROR] Missing JIRA credentials for Events sync`);
            } else {
                const projectKeys = (wp as any).jiraProjectKeys?.split(',').map((k: any) => k.trim()).join(', ') || '';
                if (projectKeys) {
                    console.log('[EVENTS DEBUG] Project keys:', projectKeys);
                    // Clear old tickets for this WP (if full sync)
                    if (!syncDays) {
                        await prisma.ticket.deleteMany({
                            where: { workPackageId: wp.id }
                        });
                    }

                    // Get all tickets from the validity periods
                    const validityPeriods = await prisma.validityPeriod.findMany({
                        where: { workPackageId: wp.id },
                        orderBy: { startDate: 'asc' }
                    });

                    for (const period of validityPeriods) {
                        console.log('[EVENTS DEBUG] Processing period:', period.startDate.toISOString().split('T')[0], 'to', period.endDate.toISOString().split('T')[0]);
                        const startDateStr = period.startDate.toISOString().split('T')[0];
                        const endDateStr = period.endDate.toISOString().split('T')[0];

                        // Build issue types array based on hasIaasService flag
                        const issueTypes = [
                            "Incidencia de Correctivo",
                            "Consulta",
                            "Solicitud de servicio"
                        ];

                        if (wp.hasIaasService) {
                            issueTypes.push("Servicio IAAS");
                            addLog(`[INFO] IAAS Service enabled - including Servicio IAAS tickets`);
                        }

                        // Use includedTicketTypes if defined, otherwise fallback to default list
                        let effectiveIssueTypes = issueTypes;
                        if ((wp as any).includedTicketTypes) {
                            effectiveIssueTypes = (wp as any).includedTicketTypes.split(',').map((t: string) => t.trim()).filter(Boolean);
                            addLog(`[INFO] Using restricted ticket types for Events: ${effectiveIssueTypes.join(', ')}`);
                        }

                        let jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in (${effectiveIssueTypes.map(t => `"${t}"`).join(', ')})`;

                        if (syncDays && syncDays > 0) {
                            jql += ` AND (updated >= "-${syncDays}d" OR created >= "-${syncDays}d")`;
                        }

                        addLog(`[INFO] Fetching tickets for period ${startDateStr} to ${endDateStr}...`);

                        // Fetch with pagination using nextPageToken
                        let nextPageToken: string | null = null;
                        const maxResults = 100;
                        let totalFetched = 0;

                        do {
                            const searchUrl = new URL(`${jiraUrl}/rest/api/3/search/jql`);
                            searchUrl.searchParams.append('jql', jql);
                            searchUrl.searchParams.append('maxResults', maxResults.toString());
                            searchUrl.searchParams.append('fields', 'key,summary,issuetype,created,status,reporter,customfield_10121');
                            if (nextPageToken) {
                                searchUrl.searchParams.append('nextPageToken', nextPageToken);
                            }

                            const jiraRes: any = await new Promise((resolve, reject) => {
                                const req = https.request({
                                    hostname: new URL(jiraUrl).hostname,
                                    port: 443,
                                    path: searchUrl.pathname + searchUrl.search,
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
                                        'Accept': 'application/json'
                                    }
                                }, (res: any) => {
                                    let data = '';
                                    res.on('data', (chunk: any) => data += chunk);
                                    res.on('end', () => {
                                        try {
                                            resolve(JSON.parse(data));
                                        } catch (e) {
                                            addLog(`[ERROR] Failed to parse JIRA response`);
                                            resolve({ issues: [] });
                                        }
                                    });
                                });
                                req.on('error', (err: any) => {
                                    addLog(`[ERROR] JIRA request failed: ${err.message}`);
                                    resolve({ issues: [] });
                                });
                                req.end();
                            });

                            if (jiraRes.errorMessages) {
                                addLog(`[ERROR] JIRA returned errors: ${JSON.stringify(jiraRes.errorMessages)}`);
                                break;
                            }

                            if (jiraRes.issues && jiraRes.issues.length > 0) {
                                totalFetched += jiraRes.issues.length;
                                totalTicketsSynced += jiraRes.issues.length;
                                console.log('[EVENTS DEBUG] Fetched', jiraRes.issues.length, 'tickets, total:', totalFetched);
                                addLog(`[INFO] Fetched ${jiraRes.issues.length} tickets (total: ${totalFetched})`);

                                // Save tickets to database
                                for (const issue of jiraRes.issues) {
                                    const createdDate = new Date(issue.fields.created);
                                    const year = createdDate.getFullYear();
                                    const month = createdDate.getMonth() + 1;

                                    // Version 3.0 - Force cache invalidation & Better logs
                                    const versionTag = "v3.0 - 2026-01-15 20:15";
                                    console.log(`[SYNC ${versionTag}] Processing EVENTOS ticket:`, issue.key, `Created: ${issue.fields.created} -> Calculated Month: ${month}`);
                                    addLog(`[SYNC] Processing ${issue.key} (Source Created: ${issue.fields.created}) -> Setting Month: ${month}`);

                                    // Use upsert to ensure year/month are ALWAYS updated from creation date
                                    // This fixes the bug where tickets appear in wrong months
                                    await prisma.ticket.upsert({
                                        where: {
                                            workPackageId_issueKey: {
                                                workPackageId: wp.id,
                                                issueKey: issue.key
                                            }
                                        },
                                        update: {
                                            issueSummary: issue.fields.summary || '',
                                            issueType: issue.fields.issuetype?.name || 'Unknown',
                                            createdDate: createdDate,
                                            year: year,  // CRITICAL: Always recalculate from creation date
                                            month: month, // CRITICAL: Always recalculate from creation date
                                            status: issue.fields.status?.name || 'Unknown',
                                            reporter: issue.fields.reporter?.displayName || 'Unknown',
                                            reporterEmail: issue.fields.reporter?.emailAddress || null,
                                            billingMode: issue.fields.customfield_10121?.value || issue.fields.customfield_10121 || null
                                        },
                                        create: {
                                            workPackageId: wp.id,
                                            issueKey: issue.key,
                                            issueSummary: issue.fields.summary || '',
                                            issueType: issue.fields.issuetype?.name || 'Unknown',
                                            createdDate: createdDate,
                                            year: year,
                                            month: month,
                                            status: issue.fields.status?.name || 'Unknown',
                                            reporter: issue.fields.reporter?.displayName || 'Unknown',
                                            reporterEmail: issue.fields.reporter?.emailAddress || null,
                                            billingMode: issue.fields.customfield_10121?.value || issue.fields.customfield_10121 || null
                                        }
                                    });
                                }


                                nextPageToken = jiraRes.nextPageToken || null;
                            } else {
                                nextPageToken = null;
                            }

                        } while (nextPageToken);

                        addLog(`[INFO] Total tickets saved for period: ${totalFetched}`);
                    }
                }
            }
        }

        // 9. Clear old metrics and worklog details (if full sync)
        if (!syncDays) {
            await prisma.monthlyMetric.deleteMany({
                where: { workPackageId: wp.id }
            });
            await prisma.worklogDetail.deleteMany({
                where: { workPackageId: wp.id }
            });
        } else {
            // For differential sync, we only delete worklogs within the sync period
            const syncCutoff = new Date();
            syncCutoff.setDate(syncCutoff.getDate() - syncDays);

            await prisma.worklogDetail.deleteMany({
                where: {
                    workPackageId: wp.id,
                    startDate: { gte: syncCutoff }
                }
            });
            // We don't delete MonthlyMetric because we will upsert them by month
        }

        // 10. Save monthly metrics (already corrected per worklog)
        for (const [key, hours] of Array.from(monthlyHours.entries())) {
            const [year, month] = key.split('-').map(Number);

            await prisma.monthlyMetric.upsert({
                where: {
                    workPackageId_year_month: {
                        workPackageId: wp.id,
                        year,
                        month
                    }
                },
                update: {
                    consumedHours: hours
                },
                create: {
                    workPackageId: wp.id,
                    year,
                    month,
                    consumedHours: hours
                }
            });

            addLog(`[DB] Saved: ${key} = ${hours.toFixed(2)}h (corrected)`);
        }

        // 10.5. Save worklog details for monthly breakdown
        if (worklogDetailsToSave.length > 0) {
            await prisma.worklogDetail.createMany({
                data: worklogDetailsToSave
            });
            console.timeEnd(`save-to-db-${wpId}`);
            addLog(`[DB] Saved ${worklogDetailsToSave.length} worklog details`);
        }

        // 10.6. Create/Update Ticket records with status information
        const uniqueTickets = new Map<string, any>();
        for (const wl of worklogDetailsToSave) {
            if (wl.issueKey && !wl.issueKey.startsWith('MANUAL-')) {
                const issueId = Array.from(issueDetails.keys()).find(id => issueDetails.get(id)?.key === wl.issueKey);
                const details = issueId ? issueDetails.get(issueId) : null;

                if (details && !uniqueTickets.has(wl.issueKey)) {
                    uniqueTickets.set(wl.issueKey, {
                        issueKey: wl.issueKey,
                        issueSummary: details.summary || wl.issueSummary,
                        issueType: details.issueType || wl.issueType,
                        status: details.status || 'Unknown',
                        priority: details.priority || 'Media',
                        slaResponse: details?.slaResponse || null,
                        slaResponseTime: details?.slaResponseTime || null,
                        slaResolution: details?.slaResolution || null,
                        slaResolutionTime: details?.slaResolutionTime || null,
                        createdDate: wl.issueCreatedDate || new Date(),
                        year: (wp.contractType?.toUpperCase() === 'EVENTOS' && wl.issueCreatedDate)
                            ? wl.issueCreatedDate.getFullYear()
                            : wl.year,
                        month: (wp.contractType?.toUpperCase() === 'EVENTOS' && wl.issueCreatedDate)
                            ? wl.issueCreatedDate.getMonth() + 1
                            : wl.month,
                        reporter: 'Unknown', // We don't have reporter info in worklog details
                        billingMode: details?.billingMode || wl.billingMode || null,
                        assignee: details?.assignee || null,
                        dueDate: details?.dueDate ? new Date(details.dueDate) : null,
                        parentKey: details?.parentKey || null,
                        component: details?.component || null,
                        clientJiraId: details?.clientJiraId || null
                    });
                }
            }
        }

        // 10.7. Also ensure all fetched tickets from issueDetails are in uniqueTickets (even if no worklogs)
        for (const [id, details] of Array.from(issueDetails.entries())) {
            if (!uniqueTickets.has(details.key)) {
                uniqueTickets.set(details.key, {
                    issueKey: details.key,
                    issueSummary: details.summary,
                    issueType: details.issueType,
                    status: details.status || 'Unknown',
                    priority: details.priority || 'Media',
                    slaResponse: details.slaResponse,
                    slaResponseTime: details.slaResponseTime,
                    slaResolution: details.slaResolution,
                    slaResolutionTime: details.slaResolutionTime,
                    createdDate: details.created ? new Date(details.created) : new Date(),
                    year: details.created ? new Date(details.created).getFullYear() : new Date().getFullYear(),
                    month: details.created ? new Date(details.created).getMonth() + 1 : new Date().getMonth() + 1,
                    reporter: details.reporter || 'Unknown',
                    billingMode: details.billingMode || null,
                    assignee: details.assignee || null,
                    dueDate: details.dueDate ? new Date(details.dueDate) : null,
                    parentKey: details.parentKey || null,
                    component: details.component || null,
                    clientJiraId: details.clientJiraId || null
                });
            } else {
                // Update reporter if it was 'Unknown' from worklogs
                const existing = uniqueTickets.get(details.key);
                if (existing.reporter === 'Unknown' && details.reporter) {
                    existing.reporter = details.reporter;
                }
            }
        }

        // Upsert tickets (update if exists, create if not)
        for (const [issueKey, ticketData] of Array.from(uniqueTickets.entries())) {
            await prisma.ticket.upsert({
                where: {
                    workPackageId_issueKey: {
                        workPackageId: wp.id,
                        issueKey: issueKey
                    }
                },
                update: {
                    issueSummary: ticketData.issueSummary,
                    issueType: ticketData.issueType,
                    year: ticketData.year,
                    month: ticketData.month,
                    status: ticketData.status,
                    priority: ticketData.priority,
                    slaResponse: ticketData.slaResponse,
                    slaResponseTime: ticketData.slaResponseTime,
                    slaResolution: ticketData.slaResolution,
                    slaResolutionTime: ticketData.slaResolutionTime,
                    billingMode: ticketData.billingMode,
                    assignee: ticketData.assignee,
                    dueDate: ticketData.dueDate,
                    parentKey: ticketData.parentKey,
                    component: ticketData.component,
                    reporter: ticketData.reporter,
                    clientJiraId: ticketData.clientJiraId || null
                },
                create: {
                    workPackageId: wp.id,
                    issueKey: issueKey,
                    issueSummary: ticketData.issueSummary,
                    issueType: ticketData.issueType,
                    createdDate: ticketData.createdDate,
                    year: ticketData.year,
                    month: ticketData.month,
                    status: ticketData.status,
                    priority: ticketData.priority,
                    slaResponse: ticketData.slaResponse,
                    slaResponseTime: ticketData.slaResponseTime,
                    slaResolution: ticketData.slaResolution,
                    slaResolutionTime: ticketData.slaResolutionTime,
                    reporter: ticketData.reporter,
                    reporterEmail: null,
                    billingMode: ticketData.billingMode,
                    assignee: ticketData.assignee,
                    dueDate: ticketData.dueDate,
                    parentKey: ticketData.parentKey,
                    component: ticketData.component,
                    clientJiraId: ticketData.clientJiraId || null
                }
            });
        }

        if (uniqueTickets.size > 0) {
            // Version 3.2 - Final Fix for EVENTOS dates
            const versionTag = "v3.2 - 2026-01-15 20:40";
            console.log(`[SYNC ${versionTag}] Starting final upsert of ${uniqueTickets.size} tickets`);
            addLog(`[SYNC] Final ticket updates starting (Version ${versionTag})`);

            addLog(`[DB] Upserted ${uniqueTickets.size} ticket records with status`);
            console.log(`[SYNC DEBUG] Upserted ${uniqueTickets.size} tickets with status`);
            // Log first few tickets for debugging
            const firstTickets = Array.from(uniqueTickets.entries()).slice(0, 3);
            firstTickets.forEach(([key, data]) => {
                addLog(`[DB] Ticket ${key}: status="${data.status}"`);
            });
        }

        // 11. Update WP total and lastSyncedAt
        const totalHours = Array.from(monthlyHours.values()).reduce((sum, h) => sum + h, 0);
        await prisma.workPackage.update({
            where: { id: wp.id },
            data: {
                accumulatedHours: totalHours,
                lastSyncedAt: new Date()
            }
        });

        if (isEventos) {
            addLog(`[SUCCESS] Sync complete: ${totalTicketsSynced} tickets found`);
            if (totalHours > 0) {
                addLog(`[INFO] Consumption from Evolutivos: ${totalHours.toFixed(2)}h`);
            }
        } else {
            addLog(`[SUCCESS] Sync complete: ${totalHours.toFixed(2)}h total`);
        }
        addLog(`===== SYNC FINISHED =====`);

        // Trigger notification check for low balance
        const { checkLowBalanceNotifications } = await import("./notifications");
        await checkLowBalanceNotifications(wp.id);

        // 12. Detect duplicate manual consumptions (only for BOLSA and BD)
        let duplicateConsumptions: any[] = [];

        if (wp.contractType === 'BOLSA' || wp.contractType === 'BD') {
            addLog(`[INFO] Checking for duplicate manual consumptions...`);

            // Find manual consumptions that might be duplicates
            // IMPORTANT: Exclude those already reviewed
            const manualRegs = await prisma.regularization.findMany({
                where: {
                    workPackageId: wp.id,
                    type: 'MANUAL_CONSUMPTION',
                    ticketId: { not: null },
                    // @ts-ignore - Field will exist after migration
                    reviewedForDuplicates: false
                }
            });

            for (const reg of manualRegs) {
                const regDate = new Date(reg.date);
                const year = regDate.getFullYear();
                const month = regDate.getMonth() + 1;

                // Check if there's a synced worklog for the same ticket and month
                // Search in ALL WPs of this client (including EVOLUTIVO WPs)
                const clientWps = await prisma.workPackage.findMany({
                    where: { clientId: wp.clientId }
                });

                const clientWpIds = clientWps.map(w => w.id);

                const syncWorklogs = await prisma.worklogDetail.findMany({
                    where: {
                        workPackageId: { in: clientWpIds },
                        issueKey: reg.ticketId,
                        year,
                        month,
                        // IMPORTANT: MUST ignore manual consumptions when searching for duplicates
                        // to avoid detecting itself (since this sync just saved the manual ones)
                        tipoImputacion: { not: 'Consumo Manual' }
                    }
                });

                if (syncWorklogs.length > 0) {
                    const totalSyncHours = syncWorklogs.reduce((sum, w) => sum + w.timeSpentHours, 0);
                    const syncWorklog = syncWorklogs[0]; // For attribution info
                    // IMPORTANT: Only mark as duplicate if it's an Evolutivo T&M
                    // Regular tickets (Incidencias, Consultas, etc.) should NOT be marked as duplicates
                    // because they are supposed to have manual consumptions

                    // Check if this ticket is an Evolutivo (T&M or Bolsa)
                    // Check if this ticket is an Evolutivo (T&M contra bolsa or Bolsa de Horas/Estimates)
                    // IMPORTANT: We EXCLUDE Facturable/T&M Facturable here because they don't consume Bolsa
                    const isEvolutivoTM = Array.from(tmBolsaEvolutivoIds).some(id => ticketIdToKey.get(id) === reg.ticketId);
                    const isEvolutivoBolsa = syncWorklog.tipoImputacion === 'Evolutivo Bolsa';

                    if (isEvolutivoTM || isEvolutivoBolsa) {
                        const exactMatch = Math.abs(totalSyncHours - reg.quantity) < 0.01;
                        duplicateConsumptions.push({
                            id: reg.id,
                            ticketId: reg.ticketId,
                            month: `${month}/${year}`,
                            manualHours: reg.quantity,
                            syncHours: totalSyncHours,
                            exactMatch,
                            wpId: syncWorklog.workPackageId // Include WP where the first worklog was found
                        });
                    }
                }
            }

            if (duplicateConsumptions.length > 0) {
                addLog(`[INFO] Found ${duplicateConsumptions.length} potential duplicate consumptions`);
            }
        }

        revalidatePath(`/dashboard`);
        return {
            success: true,
            totalHours,
            processed: validCount,
            duplicateConsumptions,
            logs: debug ? debugLogs : undefined
        };

    } catch (error: any) {
        addLog(`[ERROR] ${error.message}\n${error.stack}`);
        return { error: error.message || "Error desconocido", logs: debug ? debugLogs : undefined };
    }
}

