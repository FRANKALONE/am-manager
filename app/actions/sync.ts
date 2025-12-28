"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper function to apply correction model
function applyCorrectionModel(hours: number, wpCorrection: any): number {
    if (!wpCorrection || !wpCorrection.correctionModel) return hours;

    try {
        const config = JSON.parse(wpCorrection.correctionModel.config);

        if (config.type === "TIERED") {
            for (const tier of config.tiers) {
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

export async function syncWorkPackage(wpId: string, debug: boolean = false) {
    let fs: any = null;
    let path: any = null;
    try {
        fs = require('fs');
        path = require('path');
    } catch (e) {
        // Module not available in this environment (e.g. Edge)
    }

    const https = require('https');

    const debugLogs: string[] = [];
    const addLog = (msg: string) => {
        const timestamped = `[${new Date().toISOString()}] ${msg}`;
        if (debug) debugLogs.push(timestamped);

        // Only write to file if fs is available and NOT in Vercel production
        if (fs && path && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            try {
                const logPath = path.join(process.cwd(), 'sync-debug.log');
                fs.appendFileSync(logPath, timestamped + '\n');
            } catch (e) {
                // Silently ignore
            }
        }
        console.log(timestamped);
    };

    try {
        addLog(`===== SYNC STARTED: ${wpId} (Debug: ${debug}) =====`);

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
        });

        if (!wp) {
            addLog(`[ERROR] WP not found: ${wpId}`);
            return { error: "Work Package no encontrado", logs: debug ? debugLogs : undefined };
        }

        addLog(`[INFO] WP found: ${wp.id}, Type: ${wp.contractType}`);


        // 2. Only sync for "Bolsa", "BD" (Bolsa Dedicada), and "Eventos" contract types
        const contractType = wp.contractType?.toUpperCase();
        if (contractType !== 'BOLSA' && contractType !== 'BD' && contractType !== 'EVENTOS') {
            addLog(`[INFO] Skipping sync - Contract type not supported: ${wp.contractType}`);
            return { success: true, message: "Sync no aplicable para este tipo de contrato", processed: 0, totalHours: 0, logs: debug ? debugLogs : undefined };
        }


        // 3. Calculate date range from ALL validity periods
        if (wp.validityPeriods.length === 0) {
            addLog(`[ERROR] No validity periods defined`);
            return { error: "No hay periodos de validez definidos", logs: debug ? debugLogs : undefined };
        }

        // Find earliest start date and latest end date across all periods
        const allStartDates = wp.validityPeriods.map(p => new Date(p.startDate).getTime());
        const allEndDates = wp.validityPeriods.map(p => new Date(p.endDate).getTime());
        const earliestStart = new Date(Math.min(...allStartDates));
        const latestEnd = new Date(Math.max(...allEndDates));

        addLog(`[INFO] Syncing ALL periods: ${earliestStart.toISOString().split('T')[0]} to ${latestEnd.toISOString().split('T')[0]}`);
        addLog(`[INFO] Total validity periods: ${wp.validityPeriods.length}`);

        // Keep 'now' for correction model logic later
        const now = new Date();

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

        if (wp.tempoAccountId) {
            accountIdsSet.add(wp.tempoAccountId);
            addLog(`[INFO] Adding explicit Tempo Account ID: ${wp.tempoAccountId}`);
        }

        if (wp.oldWpId) {
            accountIdsSet.add(wp.oldWpId);
            addLog(`[INFO] Adding old WP ID as candidate: ${wp.oldWpId}`);
        }

        const accountIds = Array.from(accountIdsSet);
        if (accountIds.length === 0) {
            // Should not happen now, but as a safety measure
            accountIds.push(wp.id);
        }

        // 5. Fetch worklogs from Tempo for all account IDs across ALL periods
        const from = earliestStart.toISOString().split('T')[0];
        const to = latestEnd.toISOString().split('T')[0];

        addLog(`[INFO] Fetching worklogs from ${from} to ${to} for ${accountIds.length} account(s)`);

        let allWorklogs: any[] = [];

        // Fetch worklogs for each account ID
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
                                addLog(`[ERROR] Data preview: ${data.substring(0, 200)}`);
                                reject(e);
                            }
                        });
                    });
                    req.on('error', (err: any) => {
                        addLog(`[ERROR] Tempo request error: ${err.message}`);
                        reject(err);
                    });
                    req.end();
                });

                if (tempoRes.results && tempoRes.results.length > 0) {
                    allWorklogs.push(...tempoRes.results);
                    addLog(`[INFO] Fetched ${tempoRes.results.length} worklogs for ${accountId} (offset ${offset})`);
                    hasMore = tempoRes.results.length === limit;
                    offset += limit;
                } else {
                    if (tempoRes.errors) {
                        addLog(`[ERROR] Tempo returned errors for ${accountId}: ${JSON.stringify(tempoRes.errors)}`);
                    } else {
                        addLog(`[DEBUG] No more results from Tempo for ${accountId}`);
                    }
                    hasMore = false;
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

        // 7. Fetch issue details from Jira
        const issueDetails = new Map<string, any>();
        const BATCH_SIZE = 100;

        for (let i = 0; i < uniqueIssueIds.length; i += BATCH_SIZE) {
            const batch = uniqueIssueIds.slice(i, i + BATCH_SIZE);
            const jql = `id IN (${batch.join(',')})`;

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();
            const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

            const bodyData = JSON.stringify({
                jql,
                maxResults: BATCH_SIZE,
                fields: ['key', 'summary', 'issuetype', 'status', 'created', 'customfield_10121']
            });

            const jiraRes: any = await new Promise((resolve, reject) => {
                const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                }, (res: any) => {
                    let data = '';
                    addLog(`[DEBUG] Jira response status: ${res.statusCode}`);
                    res.on('data', (c: any) => data += c);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (res.statusCode !== 200) {
                                addLog(`[ERROR] Jira API error: ${JSON.stringify(parsed)}`);
                            }
                            resolve(parsed);
                        } catch (e) {
                            addLog(`[ERROR] Failed to parse Jira response: ${data.substring(0, 200)}`);
                            resolve({ issues: [] });
                        }
                    });
                });
                req.on('error', (err: any) => {
                    addLog(`[ERROR] Jira request error: ${err.message}`);
                    reject(err);
                });
                req.write(bodyData);
                req.end();
            });

            if (jiraRes.issues) {
                jiraRes.issues.forEach((issue: any) => {
                    // Extract billing mode value from object if it's an object
                    const billingModeRaw = issue.fields.customfield_10121;
                    const billingMode = billingModeRaw?.value || billingModeRaw || null;

                    issueDetails.set(issue.id, {
                        key: issue.key,
                        summary: issue.fields.summary || '',
                        issueType: issue.fields.issuetype?.name,
                        status: issue.fields.status?.name || 'Unknown',
                        billingMode: billingMode,
                        created: issue.fields.created // Add creation date
                    });
                });
                addLog(`[INFO] Batch process: Fetched ${jiraRes.issues.length} of ${uniqueIssueIds.length} issues`);
            } else if (jiraRes.errorMessages || jiraRes.errors) {
                addLog(`[ERROR] Jira returned errors: ${JSON.stringify(jiraRes)}`);
            } else {
                addLog(`[WARN] Jira returned no issues for batch. JQL: ${jql}`);
            }
        }

        addLog(`[INFO] Fetched details for ${issueDetails.size} issues`);

        // 7.5. Fetch user details from Jira for author names
        const authorNames = new Map<string, string>();
        addLog(`[INFO] Fetching user details for ${uniqueAuthorIds.length} authors`);

        for (const accountId of uniqueAuthorIds) {
            try {
                const jiraUrl = process.env.JIRA_URL?.trim();
                const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
                const jiraToken = process.env.JIRA_API_TOKEN?.trim();
                const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

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
                                    addLog(`[WARN] Failed to fetch user ${accountId}: ${res.statusCode}`);
                                    resolve(null);
                                }
                            } catch (e) {
                                addLog(`[ERROR] Failed to parse user response for ${accountId}`);
                                resolve(null);
                            }
                        });
                    });
                    req.on('error', (err: any) => {
                        addLog(`[ERROR] User request error for ${accountId}: ${err.message}`);
                        resolve(null);
                    });
                    req.end();
                });

                if (userRes && userRes.displayName) {
                    authorNames.set(accountId, userRes.displayName);
                    addLog(`[INFO] User ${accountId}: ${userRes.displayName}`);
                }
            } catch (error: any) {
                addLog(`[ERROR] Exception fetching user ${accountId}: ${error.message}`);
            }
        }

        addLog(`[INFO] Fetched ${authorNames.size} author names`);

        // 7.6. Fetch Evolutivos with "Bolsa de Horas" or "T&M contra bolsa" billing mode
        const evolutivoEstimates: any[] = [];
        const tmEvolutivoKeys = new Set<string>(); // Keep track of T&M tickets to fetch worklogs later

        if (wp.jiraProjectKeys) {
            const projectKeys = wp.jiraProjectKeys.split(',').map(k => k.trim()).filter(Boolean);
            if (projectKeys.length > 0) {
                addLog(`[INFO] Fetching Evolutivos with Bolsa de Horas or T&M contra bolsa for projects: ${projectKeys.join(', ')}`);

                const jql = `project IN (${projectKeys.join(',')}) AND issuetype = Evolutivo AND ("Modo de Facturación" IN ("Bolsa de Horas", "T&M contra bolsa") OR "Modo de Facturación" IS EMPTY)`;
                const bodyData = JSON.stringify({
                    jql,
                    maxResults: 1000,
                    fields: ['key', 'summary', 'created', 'timeoriginalestimate', 'customfield_10121']
                });

                const jiraUrl = process.env.JIRA_URL?.trim();
                const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
                const jiraToken = process.env.JIRA_API_TOKEN?.trim();
                const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

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
                                    addLog(`[WARN] Failed to fetch Evolutivos: ${res.statusCode}`);
                                    resolve({ issues: [] });
                                }
                            } catch (e) {
                                addLog(`[ERROR] Failed to parse Evolutivos response`);
                                resolve({ issues: [] });
                            }
                        });
                    });
                    req.on('error', (err: any) => {
                        addLog(`[ERROR] Evolutivos request error: ${err.message}`);
                        resolve({ issues: [] });
                    });
                    req.write(bodyData);
                    req.end();
                });

                if (evolutivosRes.issues && evolutivosRes.issues.length > 0) {
                    addLog(`[INFO] Found ${evolutivosRes.issues.length} Evolutivos with Bolsa de Horas or T&M contra bolsa`);

                    // First, collect T&M Evolutivos
                    const tmEvolutivos: any[] = [];

                    evolutivosRes.issues.forEach((issue: any) => {
                        const billingModeRaw = issue.fields.customfield_10121;
                        const billingMode = billingModeRaw?.value || billingModeRaw || 'Bolsa de Horas'; // Default to Bolsa if empty

                        if (billingMode === 'T&M contra bolsa') {
                            tmEvolutivoKeys.add(issue.key);
                            tmEvolutivos.push(issue);
                        }

                        // Add to issueDetails map so worklogs can be processed correctly
                        issueDetails.set(issue.id, {
                            id: issue.id,
                            key: issue.key,
                            summary: issue.fields.summary,
                            issueType: 'Evolutivo',
                            billingMode: billingMode,
                            created: issue.fields.created,
                            estimate: issue.fields.timeoriginalestimate
                        });

                        if (issue.fields.timeoriginalestimate) {
                            const createdDate = new Date(issue.fields.created);
                            const year = createdDate.getFullYear();
                            const month = createdDate.getMonth() + 1;
                            const hours = issue.fields.timeoriginalestimate / 3600;

                            evolutivoEstimates.push({
                                issueKey: issue.key,
                                issueSummary: issue.fields.summary || '',
                                estimatedHours: hours,
                                createdDate,
                                year,
                                month
                            });

                            addLog(`[INFO] Evolutivo ${issue.key}: ${hours}h estimated (created ${year}-${String(month).padStart(2, '0')})`);
                        }
                    });

                    // ONLY create EVOLUTIVO WP if we found T&M Evolutivos
                    if (tmEvolutivos.length > 0) {
                        const evoWpId = `EVO-${wp.clientId}`;
                        const existingEvoWp = await prisma.workPackage.findUnique({ where: { id: evoWpId } });
                        if (!existingEvoWp) {
                            addLog(`[INFO] Creating automatic EVOLUTIVO WP for client ${wp.clientName} (found ${tmEvolutivos.length} T&M Evolutivos)`);
                            await prisma.workPackage.create({
                                data: {
                                    id: evoWpId,
                                    name: `Evolutivos - ${wp.clientName}`,
                                    clientId: wp.clientId,
                                    clientName: wp.clientName,
                                    contractType: 'EVOLUTIVO',
                                    billingType: 'T&M BOLSA',
                                    renewalType: 'AUTOMÁTICA', // Default
                                }
                            });
                        }
                    }
                } else {
                    addLog(`[INFO] No Evolutivos with Bolsa de Horas or T&M contra bolsa found`);
                }
            }
        }

        // 7.7. Fetch worklogs for T&M Evolutivos from Tempo (Universal fetch by issue key)
        const tmWorklogs: any[] = [];
        for (const ticketKey of Array.from(tmEvolutivoKeys)) {
            addLog(`[INFO] Fetching universal worklogs for T&M ticket: ${ticketKey}`);

            const tempoRes: any = await new Promise((resolve, reject) => {
                const url = `https://api.tempo.io/4/worklogs/issue/${ticketKey}`;
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
                                addLog(`[WARN] Tempo API error for ticket ${ticketKey}: ${res.statusCode}`);
                                resolve({ results: [] });
                            }
                        } catch (e) {
                            addLog(`[ERROR] Failed to parse Tempo response for ticket ${ticketKey}`);
                            resolve({ results: [] });
                        }
                    });
                });
                req.on('error', (err: any) => {
                    addLog(`[ERROR] Tempo request error for ${ticketKey}: ${err.message}`);
                    resolve({ results: [] });
                });
                req.end();
            });

            if (tempoRes.results) {
                tmWorklogs.push(...tempoRes.results);
                addLog(`[INFO] Found ${tempoRes.results.length} worklogs for ${ticketKey}`);
            }
        }

        // 8. Load valid ticket types from configuration
        const validTicketParams = await prisma.parameter.findMany({
            where: { category: 'VALID_TICKET_TYPE' }
        });
        const validTypes = validTicketParams.map(p => p.value);

        addLog(`[INFO] Valid ticket types configured: ${validTypes.join(', ')}`);

        if (validTypes.length === 0) {
            addLog(`[WARN] No valid ticket types configured! No worklogs will be processed.`);
        }

        // 8.5. Find active correction model (before loop)
        let activeCorrection = wp.wpCorrections.find(c => {
            const corrStart = new Date(c.startDate);
            const corrEnd = c.endDate ? new Date(c.endDate) : new Date('2099-12-31');
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
        const processedWorklogIds = new Set<number>(); // Deduplication Set
        let validCount = 0;
        let skippedCount = 0;

        // Process combined worklogs (Account logs + T&M specific logs)
        const combinedWorklogs = [...allWorklogs, ...tmWorklogs];
        addLog(`[INFO] Processing ${combinedWorklogs.length} total worklogs (${allWorklogs.length} from accounts + ${tmWorklogs.length} from T&M)`);

        let firstLog = true;
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
                addLog(`[FILTER] Skipped ${logKey}: No Jira details found for ID ${issueId}`);
                skippedCount++;
                continue;
            }

            // Check if valid (normalize both sides for comparison)
            const issueType = details.issueType || 'Unknown';
            const issueTypeLower = issueType.toLowerCase().trim();
            const isValidType = validTypes.some(vt => vt.toLowerCase().trim() === issueTypeLower);
            const isEvolutivoTM = issueType === 'Evolutivo' && details.billingMode === 'T&M contra bolsa';
            const isIaasService = wp.hasIaasService && issueTypeLower === 'servicio iaas';
            const isValid = isValidType || isEvolutivoTM || isIaasService;

            if (!isValid) {
                const billingModeStr = typeof details.billingMode === 'object'
                    ? JSON.stringify(details.billingMode)
                    : (details.billingMode || 'N/A');
                addLog(`[FILTER] Skipped ${details.key}: Type "${issueType}" is NOT in valid list. Billing: ${billingModeStr}`);
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
            monthlyHours.set(key, (monthlyHours.get(key) || 0) + correctedHours);

            // Extract Tipo Imputación from Tempo work attributes
            const tipoImputacion = log.attributes?.values?.find((attr: any) =>
                attr.key === '_TipoImputación_'
            )?.value || null;

            // Determine which WP to save this worklog to
            // T&M Evolutivos go to EVOLUTIVO WP, others go to current WP
            let targetWpId = wp.id;
            if (details.issueType === 'Evolutivo' && tmEvolutivoKeys.has(details.key)) {
                // This is a T&M Evolutivo, save to EVOLUTIVO WP
                targetWpId = `EVO-${wp.clientId}`;
            }

            // Save worklog detail for monthly breakdown
            worklogDetailsToSave.push({
                workPackageId: targetWpId,
                year,
                month,
                issueKey: details.key,  // Use key from Jira details
                issueType: details.issueType,
                issueSummary: details.summary || '',
                issueCreatedDate: details.created ? new Date(details.created) : null, // Add creation date
                timeSpentHours: correctedHours,
                startDate: new Date(log.startDate),
                author: authorNames.get(log.author?.accountId) || log.author?.accountId || 'Unknown',
                tipoImputacion,
                originWpId: log.issue?.key === details.key ? (log.account?.id || log.account?.key || null) : null // Basic heuristic or rely on account info
            });

            // If it's a T&M Evolutivo from a different account, log it specifically
            if (log.issue?.key && tmEvolutivoKeys.has(log.issue.key)) {
                if (log.account?.key && log.account.key !== wp.id) {
                    addLog(`[EXT-IMPUTATION] Found T&M worklog for ${log.issue.key} in external WP: ${log.account.key}`);
                }
            }

            if (rawHours !== correctedHours) {
                addLog(`[CORRECTION] ${rawHours.toFixed(2)}h -> ${correctedHours.toFixed(2)}h`);
            }
        }

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
                tipoImputacion: 'Evolutivo Bolsa'
            });
        });

        if (evolutivoEstimates.length > 0) {
            addLog(`[INFO] Added ${evolutivoEstimates.length} Evolutivo estimates to consumption`);
        }

        // 8.7. Process regularizations
        // - MANUAL_CONSUMPTION: Add to consumed hours
        // - EXCESS/RETURN: Keep separate (regularization column)
        if (wp.regularizations && wp.regularizations.length > 0) {
            addLog(`[INFO] Processing ${wp.regularizations.length} regularizations`);

            wp.regularizations.forEach(reg => {
                const regDate = new Date(reg.date);
                const year = regDate.getFullYear();
                const month = regDate.getMonth() + 1;
                const key = `${year}-${String(month).padStart(2, '0')}`;


                if (reg.type === 'MANUAL_CONSUMPTION') {
                    // Add manual consumption to consumed hours
                    const currentHours = monthlyHours.get(key) || 0;
                    monthlyHours.set(key, currentHours + reg.quantity);

                    addLog(`[INFO] Manual Consumption: +${reg.quantity}h in ${key} (${reg.ticketId || 'N/A'})`);

                    // Add to worklog details for display
                    worklogDetailsToSave.push({
                        workPackageId: wp.id,
                        year,
                        month,
                        issueKey: reg.ticketId || `MANUAL-${reg.id}`,
                        issueType: 'Consumo Manual',
                        issueSummary: reg.description || `Consumo manual ${reg.id}`,
                        issueCreatedDate: regDate, // Use regularization date as creation date
                        timeSpentHours: reg.quantity,
                        startDate: regDate,
                        author: 'Sistema',
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

        // 8.5. For Events WP: Fetch ALL tickets from project using JIRA API v3
        if (wp.contractType?.toUpperCase() === 'EVENTOS') {
            console.log('[EVENTS DEBUG] Entering Events sync section');
            addLog(`[INFO] Fetching all tickets for Events WP...`);

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();

            if (!jiraUrl || !jiraEmail || !jiraToken) {
                addLog(`[ERROR] Missing JIRA credentials for Events sync`);
            } else {
                const projectKeys = wp.jiraProjectKeys?.split(',').map(k => k.trim()).join(', ') || '';
                if (projectKeys) {
                    console.log('[EVENTS DEBUG] Project keys:', projectKeys);
                    // Clear old tickets for this WP
                    await prisma.ticket.deleteMany({
                        where: { workPackageId: wp.id }
                    });

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

                        const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in (${issueTypes.map(t => `"${t}"`).join(', ')})`;

                        addLog(`[INFO] Fetching tickets for period ${startDateStr} to ${endDateStr}...`);

                        // Fetch with pagination using nextPageToken
                        let nextPageToken: string | null = null;
                        const maxResults = 100;
                        let totalFetched = 0;

                        do {
                            const searchUrl = new URL(`${jiraUrl}/rest/api/3/search/jql`);
                            searchUrl.searchParams.append('jql', jql);
                            searchUrl.searchParams.append('maxResults', maxResults.toString());
                            searchUrl.searchParams.append('fields', 'key,summary,issuetype,created,status,reporter');
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
                                console.log('[EVENTS DEBUG] Fetched', jiraRes.issues.length, 'tickets, total:', totalFetched);
                                addLog(`[INFO] Fetched ${jiraRes.issues.length} tickets (total: ${totalFetched})`);

                                // Save tickets to database
                                for (const issue of jiraRes.issues) {
                                    const createdDate = new Date(issue.fields.created);
                                    const year = createdDate.getFullYear();
                                    const month = createdDate.getMonth() + 1;

                                    console.log('[EVENTS DEBUG] Saving ticket:', issue.key);
                                    await prisma.ticket.create({
                                        data: {
                                            workPackageId: wp.id,
                                            issueKey: issue.key,
                                            issueSummary: issue.fields.summary || '',
                                            issueType: issue.fields.issuetype?.name || 'Unknown',
                                            createdDate: createdDate,
                                            year: year,
                                            month: month,
                                            status: issue.fields.status?.name || 'Unknown',
                                            reporter: issue.fields.reporter?.displayName || 'Unknown',
                                            reporterEmail: issue.fields.reporter?.emailAddress || null
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

        // 9. Clear old metrics and worklog details
        await prisma.monthlyMetric.deleteMany({
            where: { workPackageId: wp.id }
        });
        await prisma.worklogDetail.deleteMany({
            where: { workPackageId: wp.id }
        });

        // 10. Save monthly metrics (already corrected per worklog)
        for (const [key, hours] of Array.from(monthlyHours.entries())) {
            const [year, month] = key.split('-').map(Number);

            await prisma.monthlyMetric.create({
                data: {
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
                        createdDate: wl.issueCreatedDate || new Date(),
                        year: wl.year,
                        month: wl.month,
                        reporter: 'Unknown' // We don't have reporter info in worklog details
                    });
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
                    status: ticketData.status
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
                    reporter: ticketData.reporter,
                    reporterEmail: null
                }
            });
        }

        if (uniqueTickets.size > 0) {
            addLog(`[DB] Upserted ${uniqueTickets.size} ticket records with status`);
            console.log(`[SYNC DEBUG] Upserted ${uniqueTickets.size} tickets with status`);
            // Log first few tickets for debugging
            const firstTickets = Array.from(uniqueTickets.entries()).slice(0, 3);
            firstTickets.forEach(([key, data]) => {
                console.log(`[SYNC DEBUG] Ticket ${key}: status="${data.status}"`);
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

        addLog(`[SUCCESS] Sync complete: ${totalHours.toFixed(2)}h total`);
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
                const syncWorklog = await prisma.worklogDetail.findFirst({
                    where: {
                        workPackageId: wp.id,
                        issueKey: reg.ticketId,
                        year,
                        month
                    }
                });

                if (syncWorklog) {
                    // IMPORTANT: Only mark as duplicate if it's an Evolutivo T&M
                    // Regular tickets (Incidencias, Consultas, etc.) should NOT be marked as duplicates
                    // because they are supposed to have manual consumptions

                    // Check if this ticket is an Evolutivo T&M
                    const isEvolutivoTM = tmEvolutivoKeys.has(reg.ticketId || '');

                    if (isEvolutivoTM) {
                        const exactMatch = Math.abs(syncWorklog.timeSpentHours - reg.quantity) < 0.01;
                        duplicateConsumptions.push({
                            id: reg.id,
                            ticketId: reg.ticketId,
                            month: `${month}/${year}`,
                            manualHours: reg.quantity,
                            syncHours: syncWorklog.timeSpentHours,
                            exactMatch
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

