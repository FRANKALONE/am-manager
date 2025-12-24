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
const to = "2024-12-31";

console.log(`Testing different Tempo API endpoints for Account ID: ${accountId}\n`);

// Test 1: GET /worklogs/account/{accountId}
console.log('=== Test 1: GET /worklogs/account/{accountId} ===');
https.request(`https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}&limit=5`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            console.log(`Results: ${parsed.results?.length || 0}`);
            if (parsed.results?.[0]) {
                console.log('First worklog:', JSON.stringify(parsed.results[0], null, 2));
            }
        } else {
            console.log('Error:', data.substring(0, 200));
        }
        console.log('\n');

        // Test 2: POST /worklogs/search with accountId
        console.log('=== Test 2: POST /worklogs/search with accountId ===');
        const bodyData = JSON.stringify({
            from,
            to,
            accountId: [accountId]
        });

        const req2 = https.request('https://api.tempo.io/4/worklogs/search?limit=5', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res2) => {
            let data2 = '';
            res2.on('data', (c) => data2 += c);
            res2.on('end', () => {
                console.log(`Status: ${res2.statusCode}`);
                if (res2.statusCode === 200) {
                    const parsed2 = JSON.parse(data2);
                    console.log(`Results: ${parsed2.results?.length || 0}`);
                    if (parsed2.results?.[0]) {
                        console.log('First worklog:', JSON.stringify(parsed2.results[0], null, 2));
                    }
                } else {
                    console.log('Error:', data2.substring(0, 200));
                }
            });
        });
        req2.write(bodyData);
        req2.end();
    });
}).on('error', (e) => {
    console.error('Request error:', e);
}).end();
