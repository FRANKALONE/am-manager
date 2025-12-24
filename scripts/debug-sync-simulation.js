const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath).toString();
envConfig.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values) process.env[key.trim()] = values.join('=').trim();
});

const WP_ID = "CSE00081MANT0001.1.1";
const FROM = "2025-02-01";
const TO = "2026-01-31"; // Full Validity

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_URL = process.env.JIRA_URL;

async function fetchJira(endpoint, body) {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    return new Promise((resolve, reject) => {
        const url = `${JIRA_URL}/rest/api/3${endpoint}`;
        const options = {
            method: body ? 'POST' : 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function fetchTempo(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4${endpoint}`;
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log(`--- SIMULATION: Sync Option B (No Quotes, No Attr Filter) ---`);

    // 1. JIRA
    const standardTypes = ['"Consulta"', '"BPO"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const evolutivoType = '"Petición de observabilidad"';
    const billingField = "cf[10121]"; // NO QUOTES
    const billingValue = '"T&M contra Bolsa"';

    const partA = `issuetype IN (${standardTypes.join(",")})`;
    const partB = `(issuetype = ${evolutivoType} AND ${billingField} = ${billingValue})`;
    const jql = `project IN ("EUR") AND ((${partA}) OR (${partB})) AND updated >= "2024-01-01"`;

    console.log(`JQL: ${jql}`);

    let validIssueIds = new Set();
    let hasMore = true;
    let nextPageToken = undefined;
    let page = 0;

    while (hasMore) {
        const body = { jql, fields: ["id"], maxResults: 100 };
        if (nextPageToken) body.nextPageToken = nextPageToken;
        const res = await fetchJira('/search/jql', body);

        if (res.issues) {
            res.issues.forEach(i => validIssueIds.add(Number(i.id)));
            if (res.nextPageToken) nextPageToken = res.nextPageToken;
            else hasMore = false;
        } else {
            console.log("Jira Error/Empty:", res);
            hasMore = false;
        }
        page++;
    }
    console.log(`Found ${validIssueIds.size} Issue IDs.`);

    if (validIssueIds.size === 0) return;

    // 2. TEMPO & CALCULATE
    const issueIds = Array.from(validIssueIds);
    const chunkSize = 500;
    let totalSeconds = 0;
    let monthlyStats = {};

    console.log("Fetching Tempo (All chunks)...");

    for (let i = 0; i < issueIds.length; i += chunkSize) {
        const chunk = issueIds.slice(i, i + chunkSize);
        const tempoBody = { from: FROM, to: TO, issueId: chunk, limit: 1000 };

        let tempoMore = true;
        let offset = 0;

        while (tempoMore) {
            tempoBody.offset = offset;
            const tRes = await fetchTempo(`/worklogs/search?limit=1000`, tempoBody);
            const logs = tRes.results || [];

            logs.forEach(log => {
                // NO ATTRIBUTE FILTER
                const d = new Date(log.startDate);
                const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
                if (!monthlyStats[k]) monthlyStats[k] = 0;
                monthlyStats[k] += log.timeSpentSeconds;
                totalSeconds += log.timeSpentSeconds;
            });

            if (logs.length < 1000) tempoMore = false;
            else offset += 1000;
        }
    }

    console.log("\n--- RESULTS ---");
    console.log(`Total Hours: ${(totalSeconds / 3600).toFixed(2)}`);
    Object.keys(monthlyStats).sort().forEach(k => {
        console.log(`${k}: ${(monthlyStats[k] / 3600).toFixed(2)} hours`);
    });
}

run();
