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

export async function syncWorkPackage(wpId: string) {
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const logPath = path.join(process.cwd(), 'sync-debug.log');

    try {
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] ===== SYNC STARTED: ${wpId} =====\n`);

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
            fs.appendFileSync(logPath, `[ERROR] WP not found: ${wpId}\n`);
            return { error: "Work Package no encontrado" };
        }

        fs.appendFileSync(logPath, `[INFO] WP found: ${wp.id}, Type: ${wp.contractType}\n`);


        // 2. Only sync for "Bolsa", "BD" (Bolsa Dedicada), and "Eventos" contract types
        const contractType = wp.contractType?.toUpperCase();
        if (contractType !== 'BOLSA' && contractType !== 'BD' && contractType !== 'EVENTOS') {
            fs.appendFileSync(logPath, `[INFO] Skipping sync - Contract type not supported: ${wp.contractType}\n`);
            return { success: true, message: "Sync no aplicable para este tipo de contrato", processed: 0, totalHours: 0 };
        }


        // 3. Calculate date range from ALL validity periods
        if (wp.validityPeriods.length === 0) {
            fs.appendFileSync(logPath, `[ERROR] No validity periods defined\n`);
            return { error: "No hay periodos de validez definidos" };
        }

        // Find earliest start date and latest end date across all periods
        const allStartDates = wp.validityPeriods.map(p => new Date(p.startDate).getTime());
        const allEndDates = wp.validityPeriods.map(p => new Date(p.endDate).getTime());
        const earliestStart = new Date(Math.min(...allStartDates));
        const latestEnd = new Date(Math.max(...allEndDates));

        fs.appendFileSync(logPath, `[INFO] Syncing ALL periods: ${earliestStart.toISOString().split('T')[0]} to ${latestEnd.toISOString().split('T')[0]}\n`);
        fs.appendFileSync(logPath, `[INFO] Total validity periods: ${wp.validityPeriods.length}\n`);

        // Keep 'now' for correction model logic later
        const now = new Date();

        // 4. Collect Tempo Account IDs (current, old, and mappings)
        const accountIdsSet = new Set<string>();

        if (wp.tempoAccountId) {
            accountIdsSet.add(wp.tempoAccountId);
            fs.appendFileSync(logPath, `[INFO] Using explicit Tempo Account ID: ${wp.tempoAccountId}\n`);
        } else {
            // If no explicit ID, current ID is the primary candidate
            accountIdsSet.add(wp.id);
            fs.appendFileSync(logPath, `[INFO] No explicit Tempo Account ID. Adding current ID as candidate: ${wp.id}\n`);

            // Also add standard mapping AMA -> CSE if applicable
            if (wp.id.startsWith('AMA')) {
                const cseVariant = wp.id.replace(/^AMA/, 'CSE');
                accountIdsSet.add(cseVariant);
                fs.appendFileSync(logPath, `[INFO] Adding CSE variant as candidate: ${cseVariant}\n`);
            }
        }

        if (wp.oldWpId) {
            accountIdsSet.add(wp.oldWpId);
            fs.appendFileSync(logPath, `[INFO] Adding old WP ID as candidate: ${wp.oldWpId}\n`);
        }

        const accountIds = Array.from(accountIdsSet);
        if (accountIds.length === 0) {
            // Should not happen now, but as a safety measure
            accountIds.push(wp.id);
        }

        // 5. Fetch worklogs from Tempo for all account IDs across ALL periods
        const from = earliestStart.toISOString().split('T')[0];
        const to = latestEnd.toISOString().split('T')[0];

        fs.appendFileSync(logPath, `[INFO] Fetching worklogs from ${from} to ${to} for ${accountIds.length} account(s)\n`);

        let allWorklogs: any[] = [];

        // Fetch worklogs for each account ID
        for (const accountId of accountIds) {
            fs.appendFileSync(logPath, `[INFO] Fetching worklogs for account: ${accountId}\n`);

            let offset = 0;
            const limit = 1000;
            let hasMore = true;

            while (hasMore) {
                const tempoRes: any = await new Promise((resolve, reject) => {
                    const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=${limit}&offset=${offset}`;
                    const req = https.request(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${process.env.TEMPO_API_TOKEN}`
                        }
                    }, (res: any) => {
                        let data = '';
                        res.on('data', (c: any) => data += c);
                        res.on('end', () => {
                            fs.appendFileSync(logPath, `[DEBUG] Tempo response status: ${res.statusCode}, data length: ${data.length}\n`);
                            try {
                                if (data.length === 0) {
                                    fs.appendFileSync(logPath, `[ERROR] Empty response from Tempo\n`);
                                    resolve({ results: [] });
                                    return;
                                }
                                resolve(JSON.parse(data));
                            } catch (e) {
                                fs.appendFileSync(logPath, `[ERROR] Failed to parse Tempo response\n`);
                                fs.appendFileSync(logPath, `[ERROR] Data preview: ${data.substring(0, 200)}\n`);
                                reject(e);
                            }
                        });
                    });
                    req.on('error', reject);
                    req.end();
                });

                if (tempoRes.results) {
                    allWorklogs.push(...tempoRes.results);
                    fs.appendFileSync(logPath, `[INFO] Fetched ${tempoRes.results.length} worklogs for ${accountId} (offset ${offset})\n`);
                    hasMore = tempoRes.results.length === limit;
                    offset += limit;
                } else {
                    fs.appendFileSync(logPath, `[WARN] No results from Tempo for ${accountId}\n`);
                    hasMore = false;
                }
            }
        }

        fs.appendFileSync(logPath, `[INFO] Total worklogs fetched from all accounts: ${allWorklogs.length}\n`);

        // 6. Get unique issue IDs and author account IDs
        const uniqueIssueIds = Array.from(new Set(allWorklogs.map((log: any) => log.issue.id)));
        const uniqueAuthorIds = Array.from(new Set(allWorklogs.map((log: any) => log.author?.accountId).filter(Boolean)));
        fs.appendFileSync(logPath, `[INFO] Fetching details for ${uniqueIssueIds.length} unique issues\n`);

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
                    fs.appendFileSync(logPath, `[DEBUG] Jira response status: ${res.statusCode}\n`);
                    res.on('data', (c: any) => data += c);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            if (res.statusCode !== 200) {
                                fs.appendFileSync(logPath, `[ERROR] Jira API error: ${JSON.stringify(parsed)}\n`);
                            }
                            resolve(parsed);
                        } catch (e) {
                            fs.appendFileSync(logPath, `[ERROR] Failed to parse Jira response: ${data.substring(0, 200)}\n`);
                            resolve({ issues: [] });
                        }
                    });
                });
                req.on('error', (err: any) => {
                    fs.appendFileSync(logPath, `[ERROR] Jira request error: ${err.message}\n`);
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
            } else if (jiraRes.errorMessages || jiraRes.errors) {
                fs.appendFileSync(logPath, `[ERROR] Jira returned errors: ${JSON.stringify(jiraRes)}\n`);
            }
        }

        fs.appendFileSync(logPath, `[INFO] Fetched details for ${issueDetails.size} issues\n`);

        // 7.5. Fetch user details from Jira for author names
        const authorNames = new Map<string, string>();
        fs.appendFileSync(logPath, `[INFO] Fetching user details for ${uniqueAuthorIds.length} authors\n`);

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
                                    fs.appendFileSync(logPath, `[WARN] Failed to fetch user ${accountId}: ${res.statusCode}\n`);
                                    resolve(null);
                                }
                            } catch (e) {
                                fs.appendFileSync(logPath, `[ERROR] Failed to parse user response for ${accountId}\n`);
                                resolve(null);
                            }
                        });
                    });
                    req.on('error', (err: any) => {
                        fs.appendFileSync(logPath, `[ERROR] User request error for ${accountId}: ${err.message}\n`);
                        resolve(null);
                    });
                    req.end();
                });

                if (userRes && userRes.displayName) {
                    authorNames.set(accountId, userRes.displayName);
                    fs.appendFileSync(logPath, `[INFO] User ${accountId}: ${userRes.displayName}\n`);
                }
            } catch (error: any) {
                fs.appendFileSync(logPath, `[ERROR] Exception fetching user ${accountId}: ${error.message}\n`);
            }
        }

        fs.appendFileSync(logPath, `[INFO] Fetched ${authorNames.size} author names\n`);

        // 7.6. Fetch Evolutivos with "Bolsa de Horas" billing mode
        const evolutivoEstimates: any[] = [];
        if (wp.jiraProjectKeys) {
            const projectKeys = wp.jiraProjectKeys.split(',').map(k => k.trim()).filter(Boolean);
            if (projectKeys.length > 0) {
                fs.appendFileSync(logPath, `[INFO] Fetching Evolutivos with Bolsa de Horas or T&M contra bolsa for projects: ${projectKeys.join(', ')}\n`);

                const jql = `project IN (${projectKeys.join(',')}) AND issuetype = Evolutivo AND "Modo de Facturación" IN ("Bolsa de Horas", "T&M contra bolsa")`;
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
                                    fs.appendFileSync(logPath, `[WARN] Failed to fetch Evolutivos: ${res.statusCode}\n`);
                                    resolve({ issues: [] });
                                }
                            } catch (e) {
                                fs.appendFileSync(logPath, `[ERROR] Failed to parse Evolutivos response\n`);
                                resolve({ issues: [] });
                            }
                        });
                    });
                    req.on('error', (err: any) => {
                        fs.appendFileSync(logPath, `[ERROR] Evolutivos request error: ${err.message}\n`);
                        resolve({ issues: [] });
                    });
                    req.write(bodyData);
                    req.end();
                });

                if (evolutivosRes.issues && evolutivosRes.issues.length > 0) {
                    fs.appendFileSync(logPath, `[INFO] Found ${evolutivosRes.issues.length} Evolutivos with Bolsa de Horas or T&M contra bolsa\n`);

                    evolutivosRes.issues.forEach((issue: any) => {
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

                            fs.appendFileSync(logPath, `[INFO] Evolutivo ${issue.key}: ${hours}h estimated (created ${year}-${String(month).padStart(2, '0')})\n`);
                        }
                    });
                } else {
                    fs.appendFileSync(logPath, `[INFO] No Evolutivos with Bolsa de Horas or T&M contra bolsa found\n`);
                }
            }
        }

        // 8. Load valid ticket types from configuration
        const validTicketParams = await prisma.parameter.findMany({
            where: { category: 'VALID_TICKET_TYPE' }
        });
        const validTypes = validTicketParams.map(p => p.value);

        fs.appendFileSync(logPath, `[INFO] Valid ticket types configured: ${validTypes.join(', ')}\n`);

        if (validTypes.length === 0) {
            fs.appendFileSync(logPath, `[WARN] No valid ticket types configured! No worklogs will be processed.\n`);
        }

        // 8.5. Find active correction model (before loop)
        const activeCorrection = wp.wpCorrections.find(c => {
            const corrStart = new Date(c.startDate);
            const corrEnd = c.endDate ? new Date(c.endDate) : new Date('2099-12-31');
            return now >= corrStart && now <= corrEnd;
        });

        if (activeCorrection) {
            fs.appendFileSync(logPath, `[INFO] Using correction model: ${activeCorrection.correctionModel.name}\n`);
        } else {
            fs.appendFileSync(logPath, `[INFO] No active correction model, using raw hours\n`);
        }

        const monthlyHours = new Map<string, number>();
        const worklogDetailsToSave: any[] = []; // Collect worklog details
        let validCount = 0;
        let skippedCount = 0;

        let firstLog = true;
        for (const log of allWorklogs) {
            const issueId = String(log.issue.id);
            const details = issueDetails.get(issueId);

            // DEBUG: Log the first worklog to see structure
            if (firstLog) {
                fs.appendFileSync(logPath, `[DEBUG] First worklog structure:\n`);
                fs.appendFileSync(logPath, `[DEBUG] log.issue = ${JSON.stringify(log.issue)}\n`);
                fs.appendFileSync(logPath, `[DEBUG] log.issue.key = ${log.issue.key}\n`);
                fs.appendFileSync(logPath, `[DEBUG] details = ${JSON.stringify(details)}\n`);
                firstLog = false;
            }

            if (!details) {
                skippedCount++;
                continue;
            }

            // Check if valid (normalize both sides for comparison)
            // DB values use underscores (e.g., "INCIDENCIA_DE_CORRECTIVO")
            // Jira values use spaces (e.g., "Incidencia de Correctivo")
            const issueTypeLower = details.issueType?.toLowerCase().replace(/\s+/g, '_') || '';
            const isValidType = validTypes.some(vt => vt.toLowerCase().replace(/\s+/g, '_') === issueTypeLower);
            const isEvolutivoTM = details.issueType === 'Evolutivo' && details.billingMode === 'T&M contra bolsa';
            const isValid = isValidType || isEvolutivoTM;

            if (!isValid) {
                const billingModeStr = typeof details.billingMode === 'object'
                    ? JSON.stringify(details.billingMode)
                    : (details.billingMode || 'N/A');
                fs.appendFileSync(logPath, `[FILTER] Skipped ${details.key}: ${details.issueType} - Billing: ${billingModeStr}\n`);
                skippedCount++;
                continue;
            }

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

            // Save worklog detail for monthly breakdown
            worklogDetailsToSave.push({
                workPackageId: wp.id,
                year,
                month,
                issueKey: details.key,  // Use key from Jira details
                issueType: details.issueType,
                issueSummary: details.summary || '',
                issueCreatedDate: details.created ? new Date(details.created) : null, // Add creation date
                timeSpentHours: correctedHours,
                startDate: new Date(log.startDate),
                author: authorNames.get(log.author?.accountId) || log.author?.accountId || 'Unknown',
                tipoImputacion
            });

            if (rawHours !== correctedHours) {
                fs.appendFileSync(logPath, `[CORRECTION] ${rawHours.toFixed(2)}h -> ${correctedHours.toFixed(2)}h\n`);
            }
        }

        fs.appendFileSync(logPath, `[INFO] Filtered: ${validCount} valid, ${skippedCount} skipped\n`);

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
            fs.appendFileSync(logPath, `[INFO] Added ${evolutivoEstimates.length} Evolutivo estimates to consumption\n`);
        }

        // 8.7. Process regularizations
        // - MANUAL_CONSUMPTION: Add to consumed hours
        // - EXCESS/RETURN: Keep separate (regularization column)
        if (wp.regularizations && wp.regularizations.length > 0) {
            fs.appendFileSync(logPath, `[INFO] Processing ${wp.regularizations.length} regularizations\n`);

            wp.regularizations.forEach(reg => {
                const regDate = new Date(reg.date);
                const year = regDate.getFullYear();
                const month = regDate.getMonth() + 1;
                const key = `${year}-${String(month).padStart(2, '0')}`;


                if (reg.type === 'MANUAL_CONSUMPTION') {
                    // Add manual consumption to consumed hours
                    const currentHours = monthlyHours.get(key) || 0;
                    monthlyHours.set(key, currentHours + reg.quantity);

                    fs.appendFileSync(logPath, `[INFO] Manual Consumption: +${reg.quantity}h in ${key} (${reg.ticketId || 'N/A'})\n`);

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
                } else if (reg.type === 'EXCESS' || reg.type === 'RETURN') {
                    // DON'T subtract from consumption - regularizations are separate!
                    // const currentHours = monthlyHours.get(key) || 0;
                    // monthlyHours.set(key, currentHours - reg.quantity);

                    fs.appendFileSync(logPath, `[INFO] Regularization ${reg.type}: -${reg.quantity}h in ${key} (${reg.description || 'N/A'})\n`);

                    // DON'T add to worklog details - regularizations are calculated separately in dashboard
                }
            });
        }

        // 8.5. For Events WP: Fetch ALL tickets from project using JIRA API v3
        if (wp.contractType?.toUpperCase() === 'EVENTOS') {
            console.log('[EVENTS DEBUG] Entering Events sync section');
            fs.appendFileSync(logPath, `[INFO] Fetching all tickets for Events WP...\n`);

            const jiraUrl = process.env.JIRA_URL?.trim();
            const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
            const jiraToken = process.env.JIRA_API_TOKEN?.trim();

            if (!jiraUrl || !jiraEmail || !jiraToken) {
                fs.appendFileSync(logPath, `[ERROR] Missing JIRA credentials for Events sync\n`);
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
                            fs.appendFileSync(logPath, `[INFO] IAAS Service enabled - including Servicio IAAS tickets\n`);
                        }

                        const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in (${issueTypes.map(t => `"${t}"`).join(', ')})`;

                        fs.appendFileSync(logPath, `[INFO] Fetching tickets for period ${startDateStr} to ${endDateStr}...\n`);

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
                                            fs.appendFileSync(logPath, `[ERROR] Failed to parse JIRA response\n`);
                                            resolve({ issues: [] });
                                        }
                                    });
                                });
                                req.on('error', (err: any) => {
                                    fs.appendFileSync(logPath, `[ERROR] JIRA request failed: ${err.message}\n`);
                                    resolve({ issues: [] });
                                });
                                req.end();
                            });

                            if (jiraRes.errorMessages) {
                                fs.appendFileSync(logPath, `[ERROR] JIRA returned errors: ${JSON.stringify(jiraRes.errorMessages)}\n`);
                                break;
                            }

                            if (jiraRes.issues && jiraRes.issues.length > 0) {
                                totalFetched += jiraRes.issues.length;
                                console.log('[EVENTS DEBUG] Fetched', jiraRes.issues.length, 'tickets, total:', totalFetched);
                                fs.appendFileSync(logPath, `[INFO] Fetched ${jiraRes.issues.length} tickets (total: ${totalFetched})\n`);

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

                        fs.appendFileSync(logPath, `[INFO] Total tickets saved for period: ${totalFetched}\n`);
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

            fs.appendFileSync(logPath, `[DB] Saved: ${key} = ${hours.toFixed(2)}h (corrected)\n`);
        }

        // 10.5. Save worklog details for monthly breakdown
        if (worklogDetailsToSave.length > 0) {
            await prisma.worklogDetail.createMany({
                data: worklogDetailsToSave
            });
            fs.appendFileSync(logPath, `[DB] Saved ${worklogDetailsToSave.length} worklog details\n`);
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
            fs.appendFileSync(logPath, `[DB] Upserted ${uniqueTickets.size} ticket records with status\n`);
            console.log(`[SYNC DEBUG] Upserted ${uniqueTickets.size} tickets with status`);
            // Log first few tickets for debugging
            const firstTickets = Array.from(uniqueTickets.entries()).slice(0, 3);
            firstTickets.forEach(([key, data]) => {
                console.log(`[SYNC DEBUG] Ticket ${key}: status="${data.status}"`);
                fs.appendFileSync(logPath, `[DB] Ticket ${key}: status="${data.status}"\n`);
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

        fs.appendFileSync(logPath, `[SUCCESS] Sync complete: ${totalHours.toFixed(2)}h total\n`);
        fs.appendFileSync(logPath, `===== SYNC FINISHED =====\n`);

        revalidatePath(`/dashboard`);
        return { success: true, totalHours, processed: validCount };

    } catch (error: any) {
        fs.appendFileSync(logPath, `[ERROR] ${error.message}\n${error.stack}\n`);
        return { error: error.message || "Error desconocido" };
    }
}

