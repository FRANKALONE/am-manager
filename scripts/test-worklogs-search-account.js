const https = require('https');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
        let value = values.join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
    }
});

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const accountId = 1129; // CSE00081MANT0001.1.1
const from = "2024-07-31";
const to = "2026-01-31";

console.log(`Testing /worklogs/search with accountId filter`);
console.log(`Account ID: ${accountId}`);
console.log(`Date range: ${from} to ${to}\n`);

const bodyData = JSON.stringify({
    from,
    to,
    accountId: [accountId]
});

const req = https.request('https://api.tempo.io/4/worklogs/search?limit=10&offset=0', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response:\n${data}\n`);

        try {
            const parsed = JSON.parse(data);
            if (parsed.results) {
                console.log(`Found ${parsed.results.length} worklogs`);
                if (parsed.results.length > 0) {
                    console.log(`\nFirst worklog:`);
                    console.log(JSON.stringify(parsed.results[0], null, 2));
                }
            } else if (parsed.errors) {
                console.log(`Errors:`, parsed.errors);
            }
        } catch (e) {
            console.log(`Failed to parse JSON:`, e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error:`, e);
});

req.write(bodyData);
req.end();
