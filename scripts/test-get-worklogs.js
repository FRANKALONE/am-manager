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

console.log(`Testing GET /worklogs with date and account filters`);
console.log(`Account ID: ${accountId}`);
console.log(`Date range: ${from} to ${to}\n`);

// Use GET /worklogs with query params (NOT POST /worklogs/search)
const url = `https://api.tempo.io/4/worklogs?from=${from}&to=${to}&limit=10&offset=0`;
console.log(`URL: ${url}\n`);

https.request(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response:\n${data.substring(0, 500)}\n`);

        try {
            const parsed = JSON.parse(data);
            if (parsed.results) {
                console.log(`Found ${parsed.results.length} worklogs`);
                if (parsed.results.length > 0) {
                    console.log(`\nFirst worklog date: ${parsed.results[0].startDate}`);
                    console.log(`Last worklog date: ${parsed.results[parsed.results.length - 1].startDate}`);
                }
            } else if (parsed.errors) {
                console.log(`Errors:`, parsed.errors);
            }
        } catch (e) {
            console.log(`Failed to parse JSON:`, e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Request error:`, e);
}).end();
