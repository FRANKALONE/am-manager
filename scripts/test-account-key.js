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
const accountKey = "CSE00081MANT0001.1.1"; // Using Account KEY not ID
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Testing with Account KEY (not ID) ===`);
console.log(`Account Key: ${accountKey}`);
console.log(`Date range: ${from} to ${to}\n`);

// Test 1: Using Account Key in search
console.log('Test 1: POST /worklogs/search with accountKey\n');

const bodyData = JSON.stringify({
    from,
    to,
    accountKey: [accountKey]
});

const req = https.request('https://api.tempo.io/4/worklogs/search?limit=10', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Results: ${parsed.results?.length || 0}`);

            if (parsed.results && parsed.results.length > 0) {
                const totalSeconds = parsed.results.reduce((sum, log) => sum + (log.timeSpentSeconds || 0), 0);
                const totalHours = totalSeconds / 3600;
                console.log(`Total hours (first 10): ${totalHours.toFixed(2)}h\n`);

                console.log('First worklog:');
                const first = parsed.results[0];
                console.log(`  Issue: ${first.issue.key || first.issue.id}`);
                console.log(`  Date: ${first.startDate}`);
                console.log(`  Hours: ${(first.timeSpentSeconds / 3600).toFixed(2)}h`);
                console.log(`  Description: ${first.description || 'N/A'}`);
            } else {
                console.log('No results found');
                console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 500));
            }
        } catch (e) {
            console.error('Failed to parse:', e);
            console.log('Raw:', data.substring(0, 500));
        }
    });
});
req.on('error', (e) => console.error('Error:', e));
req.write(bodyData);
req.end();
