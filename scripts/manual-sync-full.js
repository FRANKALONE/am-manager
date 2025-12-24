const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Load Env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath).toString();
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values) process.env[key.trim()] = values.join('=').trim();
    });
}

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_URL = process.env.JIRA_URL;

// --- TEMPO FETCH WITH PAGINATION ---
async function fetchTempo(endpoint, body) {
    return new Promise((resolve, reject) => {
        const hasQuery = endpoint.includes('?');
        const url = `https://api.tempo.io/4${endpoint}${hasQuery ? '&' : '?'}limit=1000`;
        const req = https.request(url, {
            method: 'POST', // Only used for search here
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getWorklogs(from, to, projectKey) {
    const limit = 1000;
    const body = {
        from,
        to,
        limit,
        offset: 0,
        projectKey: [projectKey]
    };

    let allResults = [];
    let hasMore = true;

    console.log(`Fetching Tempo Logs (Unlimited)...`);
    while (hasMore) {
        process.stdout.write(`Fetching offset ${body.offset}... `);
        const response = await fetchTempo("/worklogs/search", body);
        const results = response.results || [];
        console.log(`Got ${results.length}`);

        allResults = [...allResults, ...results];

        if (results.length < limit) {
            hasMore = false;
        } else {
            body.offset += limit;
        }
    }
    return allResults;
}

// --- JIRA CHECK ---
async function checkJiraTypes(ids) {
    if (ids.length === 0) return new Set();

    // Chunking not implemented for simple script, assuming < 100 unique valid logs or just doing one big batch if JQL allows? JQL limits usually ~6000 chars. 
    // Let's do batch of 100.
    let validIds = new Set();

    const chunkSize = 50;
    const idsArray = Array.from(ids);

    console.log(`Checking Jira Types for ${idsArray.length} unique issues...`);

    for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const reqTypes = ['"BPO"', '"Consulta"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
        const jql = `id IN (${chunk.join(",")}) AND issuetype IN (${reqTypes.join(",")})`;

        const url = `${JIRA_URL}/rest/api/3/search/jql`;
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    jql,
                    fields: ["issuetype"]
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.issues) {
                    data.issues.forEach(iss => validIds.add(String(iss.id)));
                }
            } else {
                console.error("Jira Fail", res.status, await res.text());
            }
        } catch (e) {
            console.error("Jira Error", e);
        }
    }
    return validIds;
}

// --- MAIN SYNC REPLICATION ---
async function run() {
    const wpId = "CSE00081MANT0001.1.1";
    console.log(`Simulating Sync for ${wpId}`);

    // 1. Get WP Dates
    // Hardcoding for test based on known values
    const from = "2025-02-01";
    const to = "2026-01-31";
    // Note: Tempo future data might be empty but we check range.

    // 2. Fetch Logs
    const allWorklogs = await getWorklogs(from, to, "EUR");
    console.log(`Total Worklogs Fetched: ${allWorklogs.length}`);

    // 3. Filter by Attribute FIRST (Optimization matching sync.ts logic? No, sync.ts filters issues first then attr. Let's follow sync.ts order roughly or optimized)
    // Actually sync.ts filters by issue type first.
    // Let's do that.

    const uniqueIssueIds = new Set(allWorklogs.map(l => l.issue.id));
    const validIssueIds = await checkJiraTypes(uniqueIssueIds);
    console.log(`Valid Issue IDs (Type Match): ${validIssueIds.size}`);

    let totalHours = 0;
    let febHours = 0;
    let matchedLogsCount = 0;

    for (const log of allWorklogs) {
        const issueId = String(log.issue.id);

        // 1. Valid Issue Check
        if (!validIssueIds.has(issueId)) continue;

        // 2. Attribute Check
        const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
        if (!clientAttr || clientAttr.value !== wpId) {
            // console.log(`Mismatch: ${clientAttr?.value}`);
            continue;
        }

        const h = log.timeSpentSeconds / 3600;
        totalHours += h;
        matchedLogsCount++;

        const date = new Date(log.startDate);
        if (date.getMonth() === 1) { // Feb (0-indexed)
            febHours += h;
        }
    }

    console.log(`\n--- FINAL RESULT ---`);
    console.log(`Matched Logs: ${matchedLogsCount}`);
    console.log(`Total Hours (Feb 25 - Jan 26): ${totalHours.toFixed(2)}`);
    console.log(`Feb 2025 Hours: ${febHours.toFixed(2)}`);

    // If this matches ~24h (or 20.87 valid), then the logic is correct.
}

run();
