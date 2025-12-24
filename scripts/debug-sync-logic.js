const fs = require('fs');
const path = require('path');
const https = require('https');

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

console.log("Env check:", {
    TEMPO_TOKEN: !!TEMPO_TOKEN ? "OK" : "MISSING",
    JIRA_TOKEN: !!JIRA_TOKEN ? "OK" : "MISSING",
    JIRA_URL
});

async function fetchTempo(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4${endpoint}`;
        const req = https.request(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${TEMPO_TOKEN}` }
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
        req.end();
    });
}

// Replicating getWorklogs logic (POST)
async function getLogs(from, to, projectKey, accountKey) {
    console.log(`Fetching Tempo (POST): from=${from} to=${to}`);
    return new Promise((resolve, reject) => {
        // Construct Body
        const body = {
            from: from,
            to: to,
            limit: 5000
        };
        if (projectKey) body.projectKey = [projectKey];

        const url = `https://api.tempo.io/4/worklogs/search`; // V4 Search
        const req = https.request(url, {
            method: 'POST',
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
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    const projectKey = "EUR";

    // 1. Analyze FEB 2025
    const targetWP = "CSE00081MANT0001.1.1";
    console.log(`\n--- Analyzing FEB 2025 Attributes for ${targetWP} ---`);
    const logsFeb = await getLogs("2025-02-01", "2025-02-28", projectKey);
    const resultsFeb = logsFeb.results || [];
    console.log(`Feb Raw Logs: ${resultsFeb.length}`);

    // Analyze Client Attribute
    const clientsFound = {};
    let matchedLogs = 0;
    let matchedHours = 0;

    resultsFeb.forEach(log => {
        const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
        const clientVal = clientAttr ? clientAttr.value : "MISSING";

        clientsFound[clientVal] = (clientsFound[clientVal] || 0) + 1;

        if (clientVal === targetWP) {
            matchedLogs++;
            matchedHours += (log.timeSpentSeconds / 3600);
        }
    });

    console.log("Client Attribute Distribution (Top 10):");
    Object.entries(clientsFound)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([k, v]) => console.log(`  ${k}: ${v} logs`));

    console.log(`\n--- MATCH REPORT ---`);
    console.log(`Logs matching ${targetWP}: ${matchedLogs}`);
    console.log(`Hours matching ${targetWP}: ${matchedHours.toFixed(2)}`);

    // 3. Inspect Issue Types for matching logs only (if any)
    const relevantLogs = resultsFeb.filter(log => {
        const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
        return clientAttr && clientAttr.value === targetWP;
    });

    if (relevantLogs.length > 0) {
        const sampleIds = [...new Set(relevantLogs.map(l => l.issue.id))].slice(0, 5);
        console.log(`\n--- Inspecting Types for MATCHING IDs: ${sampleIds.join(', ')} ---`);

        // Use POST search/jql
        const jql = `id IN (${sampleIds.join(',')})`;
        const jiraUrl = `${process.env.JIRA_URL}/rest/api/3/search/jql`; // CORRECT ENDPOINT

        try {
            const auth = Buffer.from(`${process.env.JIRA_USER_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
            const res = await fetch(jiraUrl, {
                method: "POST",
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jql,
                    fields: ["issuetype", "summary", "key"]
                })
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Jira Issues Checked:", data.issues.length);
                data.issues.forEach(iss => {
                    console.log(`ID ${iss.id} (${iss.key}): Type="${iss.fields.issuetype.name}"`);
                });
            } else {
                console.error("Jira Fail:", res.status, await res.text());
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 2. Analyze MAR 2025
    // Actually, let's analyze ALL future months just to see where the data is
    console.log(`\n--- Analyzing MAR-DEC 2025 ---`);
    const logsRest = await getLogs("2025-03-01", "2025-12-31", projectKey);
    const resultsRest = logsRest.results || [];
    console.log(`Rest 2025 Raw Logs: ${resultsRest.length}`);
    const totalRest = resultsRest.reduce((sum, log) => sum + (log.timeSpentSeconds / 3600), 0);
    console.log(`Rest 2025 Raw Hours: ${totalRest.toFixed(2)}`);

    // 3. Inspect Issue Types for a sample from Feb
    if (resultsFeb.length > 0) {
        // Pick a few distinct issue IDs to check their types
        const sampleIds = [...new Set(resultsFeb.map(l => l.issue.id))].slice(0, 5);
        console.log(`\n--- Inspecting Types for IDs: ${sampleIds.join(', ')} ---`);

        const jql = `id IN (${sampleIds.join(',')})`;
        // We added JIRA_URL check
        const jiraUrl = `${process.env.JIRA_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=issuetype,summary,key`;

        try {
            const auth = Buffer.from(`${process.env.JIRA_USER_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
            const res = await fetch(jiraUrl, {
                headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Jira Issues Checked:", data.issues.length);
                data.issues.forEach(iss => {
                    console.log(`ID ${iss.id} (${iss.key}): Type="${iss.fields.issuetype.name}" | Summary="${iss.fields.summary}"`);
                });
            } else {
                console.error("Jira Fail:", res.status, await res.text());
            }
        } catch (e) {
            console.error(e);
        }
    }
}

run();
