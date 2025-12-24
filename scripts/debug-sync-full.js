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

// Mock Prisma / Context
const WP_ID = "CSE00081MANT0001.1.1";
const JIRA_PROJECTS = "EUR";
const FROM = "2025-02-01";
const TO = "2026-01-31";

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_URL = process.env.JIRA_URL;

// --- API CLIENTS ---
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

// --- MAIN LOGIC (Mimic sync.ts Option B) ---
async function run() {
    console.log(`--- DEBUG SYNC (Option B) for ${WP_ID} ---`);
    console.log(`Range: ${FROM} to ${TO}`);

    // 1. JIRA FETCH
    const standardTypes = ['"Consulta"', '"BPO"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const evolutivoType = '"Petición de observabilidad"';
    const billingField = "cf[10121]";
    const billingValue = '"T&M contra Bolsa"';

    const partA = `issuetype IN (${standardTypes.join(",")})`;
    const partB = `(issuetype = ${evolutivoType} AND ${billingField} = ${billingValue})`;

    // UPDATED Filter: Should we check Updated date?
    // User complaint: "tickets creados 2 meses antes".
    // Sync Logic uses updated >= 2024-01-01
    const safeDate = "2024-01-01";
    const jql = `project IN ("EUR") AND ((${partA}) OR (${partB})) AND updated >= "${safeDate}"`;

    console.log(`\n1. Searching Jira Issues...`);
    console.log(`JQL: ${jql}`);

    let validIssueIds = new Set();
    let hasMore = true;
    let nextPageToken = undefined;
    let page = 0;

    while (hasMore) {
        const body = {
            jql,
            fields: ["id", "key", "issuetype", billingField], // Inspect fields
            maxResults: 100
        };
        if (nextPageToken) body.nextPageToken = nextPageToken;

        const res = await fetchJira('/search/jql', body);

        if (res.issues && res.issues.length > 0) {
            console.log(`   Page ${page}: Found ${res.issues.length} issues.`);
            res.issues.forEach(i => validIssueIds.add(String(i.id)));

            // Log first one
            if (page === 0) console.log(`   Sample Issue: ${res.issues[0].key} (${res.issues[0].fields.issuetype.name})`);

            if (res.nextPageToken) nextPageToken = res.nextPageToken;
            else hasMore = false;
            page++;
        } else {
            hasMore = false;
        }
        if (page > 10) break; // Safety
    }

    console.log(`Total Valid Issues: ${validIssueIds.size}`);

    if (validIssueIds.size === 0) return;

    // 2. TEMPO FETCH
    const issueIds = Array.from(validIssueIds).map(Number);
    console.log(`\n2. Fetching Tempo Logs for ${issueIds.length} Issues...`);

    // Chunking
    const chunkSize = 500;
    let allWorklogs = [];

    // Just try first chunk for debug speed
    const chunk = issueIds.slice(0, chunkSize);
    console.log(`   Testing Chunk 1 (${chunk.length} IDs)...`);

    // Manual getWorklogs mimic
    const tempoBody = {
        from: FROM,
        to: TO,
        issueId: chunk,
        limit: 1000,
        offset: 0
    };

    const tempoRes = await fetchTempo(`/worklogs/search?limit=1000`, tempoBody);
    const logs = tempoRes.results || [];
    console.log(`   Fetched ${logs.length} logs in Chunk 1.`);

    if (logs.length > 0) {
        console.log(`   Sample Log Issue ID: ${logs[0].issue.id}`);
        console.log(`   Sample Log Attributes: ${JSON.stringify(logs[0].attributes?.values)}`);
    }

    // 3. FILTER CHECK
    console.log(`\n3. Filtering by Client Attribute (${WP_ID})...`);
    let kept = 0;
    logs.forEach(log => {
        const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
        if (clientAttr && clientAttr.value === WP_ID) {
            kept++;
        } else {
            // console.log(`   Dropped Log (Client: ${clientAttr?.value})`);
        }
    });
    console.log(`   Kept ${kept} logs after filtering.`);
}

run();
