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

const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_URL = process.env.JIRA_URL;

async function searchJira(jql) {
    const url = `${JIRA_URL}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

    const body = {
        jql: jql,
        maxResults: 1 // Try 1 instead of 0
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log("Raw Response:", text.substring(0, 500));
    try {
        return JSON.parse(text);
    } catch {
        return { total: 'Error parsing' };
    }
}

async function run() {
    const project = "EUR";

    // 1. All Issues (No Date) - Just to know size
    const allJql = `project = "${project}"`;
    const all = await searchJira(allJql);
    console.log(`\nReviewing JIRA Volume for Project ${project} (ALL TIME):`);
    console.log(`Total Issues (All Types): ${all.total}`);

    // 2. Valid Types (No Date)
    const validTypes = ['"BPO"', '"Consulta"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const validJql = `project = "${project}" AND issuetype in (${validTypes.join(",")})`;
    const valid = await searchJira(validJql);
    console.log(`Total Valid Type Issues (BPO/Consulta/etc): ${valid.total}`);

    // 3. Valid Types used in 2025 (Updated in 2025)
    // This is a middle ground: tickets active in 2025.
    const activeJql = `project = "${project}" AND issuetype in (${validTypes.join(",")}) AND updated >= "2025-01-01"`;
    const active = await searchJira(activeJql);
    console.log(`Valid Type Issues Updated since 2025: ${active.total}`);

    if (all.total) {
        console.log(`Targeting Valid Types reduces scope to: ${((valid.total / all.total) * 100).toFixed(1)}% of total volume.`);
    }
}

run();
