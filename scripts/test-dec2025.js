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

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_URL = process.env.JIRA_URL;

async function fetchJira(endpoint, body) {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    return new Promise((resolve, reject) => {
        const url = `${JIRA_URL}/rest/api/3${endpoint}`;
        const options = {
            method: 'POST',
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
        req.write(JSON.stringify(body));
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
    console.log("--- SIMULATION DEC 2025 ---");

    // 1. JQL
    const standardTypes = ['"Consulta"', '"BPO"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const evolutivoType = '"Petición de observabilidad"';
    const billingField = "cf[10121]";
    const billingValue = '"T&M contra Bolsa"';

    // Option B JQL
    const partA = `issuetype IN (${standardTypes.join(",")})`;
    const partB = `(issuetype = ${evolutivoType} AND ${billingField} = ${billingValue})`;
    const jql = `project IN ("EUR") AND ((${partA}) OR (${partB})) AND updated >= "2024-01-01"`;

    console.log("Getting Issue IDs...");
    const bodyJira = { jql, fields: ["id"], maxResults: 100 };
    let issues = [];

    // Fetch only first 1000 for speed, usually enough to sample
    let hasMore = true;
    let startAt = 0;
    while (startAt < 2000 && hasMore) {
        bodyJira.startAt = startAt;
        const res = await fetchJira('/search/jql', bodyJira);
        if (res.issues) {
            issues.push(...res.issues.map(i => i.id));
            if (res.total && startAt + 100 < res.total) startAt += 100;
            else hasMore = false;
        } else {
            hasMore = false;
        }
    }
    console.log(`Found ${issues.length} IDs.`);

    // 2. Tempo Dec 2025
    console.log("Fetching Tempo for DEC 2025...");
    const chunk = issues.slice(0, 1000); // 1000 max

    const tempoBody = {
        from: "2025-12-01",
        to: "2025-12-31",
        issueId: chunk.map(Number),
        limit: 1000
    };

    const tRes = await fetchTempo(`/worklogs/search?limit=1000`, tempoBody);
    console.log(`Tempo Results Count: ${tRes.results?.length || 0}`);

    if (tRes.results && tRes.results.length > 0) {
        let totalSeconds = 0;
        tRes.results.forEach(l => totalSeconds += l.timeSpentSeconds);
        console.log(`Total Hours: ${(totalSeconds / 3600).toFixed(2)}`);
    } else {
        console.log("Raw Response if empty:", JSON.stringify(tRes).substring(0, 200));
    }
}

run();
