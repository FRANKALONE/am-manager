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

async function fetchJira(endpoint, body) {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
    return new Promise((resolve, reject) => {
        const url = `${JIRA_URL}/rest/api/3${endpoint}`;
        const req = https.request(url, {
            method: 'POST',
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
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("--- TEST: Option B JQL Verification ---");

    const standardTypes = ['"Consulta"', '"BPO"', '"Incidencia de correctivo"', '"Solicitud de servicio"'];
    const evolutivoType = '"Petición de observabilidad"';
    // Correct Syntax: cf[10121] without quotes. 
    // Value: "T&M contra Bolsa" (Capital B potentially)
    const billingField = "cf[10121]";
    const billingValue = '"T&M contra Bolsa"';
    const safeDate = "2024-01-01";

    const partA = `issuetype IN (${standardTypes.join(",")})`;
    const partB = `(issuetype = ${evolutivoType} AND ${billingField} = ${billingValue})`; // Removed quotes around field

    // Check Part values
    // Are quotes correct?

    // FULL JQL
    const jql = `project IN ("EUR") AND ((${partA}) OR (${partB})) AND updated >= "${safeDate}"`;

    console.log(`JQL: ${jql}`);

    try {
        const body = {
            jql: jql,
            maxResults: 10,
            fields: ["id", "key", "issuetype", "customfield_10121"]
        };

        const res = await fetchJira(`/search/jql`, body);
        console.log("Response Keys:", Object.keys(res));
        if (res.errorMessages) console.error("JQL Errors:", res.errorMessages);
        if (res.warningMessages) console.warn("JQL Warnings:", res.warningMessages);

        console.log(`Total Issues Found: ${res.total}`);
        if (res.issues && res.issues.length > 0) {
            console.log("Sample ID:", res.issues[0].id, res.issues[0].key);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
