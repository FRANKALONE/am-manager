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

async function fetchJira(endpoint) {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    return new Promise((resolve, reject) => {
        const url = `${JIRA_URL}/rest/api/3${endpoint}`;
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.end();
    });
}

async function run() {
    // 1. Search for one Evolutivo ticket (or any ticket really, field likely exists on all)
    // JQL: project = "EUR" AND issuetype = "Petición de observabilidad" (Evolutivo)
    // Or just search checking fields
    console.log("Searching for fields...");

    // We can use the /field endpoint to list all fields and search by name
    const fields = await fetchJira('/field');
    if (Array.isArray(fields)) {
        // Search for "Account" (Tempo Field)
        const target = fields.find(f => f.name.toLowerCase() === "account" || f.name.toLowerCase() === "cuenta");
        const candidates = fields.filter(f => f.name.toLowerCase().includes("account"));

        if (target) {
            console.log("Found Exact Match:", target);
        }

        if (candidates.length > 0) {
            console.log("Found Candidates:", candidates.map(c => ({ name: c.name, id: c.id })));
        } else {
            console.log("No Account field found.");
        }
        console.log("Field 'facturación' not found in global list. Dumping similarly named fields:");
        fields.filter(f => f.name.toLowerCase().includes("tipo")).forEach(f => console.log(f.name, f.id));
    } else {
        console.log("Error fetching fields:", fields);
    }
}

run();
