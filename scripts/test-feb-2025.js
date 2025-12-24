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
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Testing Tempo API for February 2025 ===`);
console.log(`Account ID: ${accountId}`);
console.log(`Date range: ${from} to ${to}\n`);

let allWorklogs = [];
let offset = 0;
const limit = 1000;
let hasMore = true;

async function fetchWorklogs() {
    while (hasMore) {
        const bodyData = JSON.stringify({
            from,
            to,
            accountId: [accountId]
        });

        const result = await new Promise((resolve, reject) => {
            const url = `https://api.tempo.io/4/worklogs/search?limit=${limit}&offset=${offset}`;
            const req = https.request(url, {
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
                        resolve(JSON.parse(data));
                    } catch (e) {
                        console.error('Failed to parse response');
                        resolve({ results: [] });
                    }
                });
            });
            req.on('error', reject);
            req.write(bodyData);
            req.end();
        });

        if (result.results && result.results.length > 0) {
            allWorklogs = [...allWorklogs, ...result.results];
            console.log(`Batch ${Math.floor(offset / limit) + 1}: ${result.results.length} worklogs (total: ${allWorklogs.length})`);

            if (result.results.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        } else {
            hasMore = false;
        }
    }

    // Calculate total hours
    const totalSeconds = allWorklogs.reduce((sum, log) => sum + (log.timeSpentSeconds || 0), 0);
    const totalHours = totalSeconds / 3600;

    console.log(`\n=== RESULTS ===`);
    console.log(`Total worklogs: ${allWorklogs.length}`);
    console.log(`Total hours: ${totalHours.toFixed(2)}h`);
    console.log(`Total seconds: ${totalSeconds}`);

    // Show first 3 worklogs as sample
    if (allWorklogs.length > 0) {
        console.log(`\n=== Sample worklogs (first 3) ===`);
        allWorklogs.slice(0, 3).forEach((log, i) => {
            console.log(`\n${i + 1}. Issue: ${log.issue.key || log.issue.id}`);
            console.log(`   Date: ${log.startDate}`);
            console.log(`   Hours: ${(log.timeSpentSeconds / 3600).toFixed(2)}h`);
            console.log(`   Description: ${log.description || 'N/A'}`);
        });
    }
}

fetchWorklogs().catch(err => {
    console.error('Error:', err);
});
