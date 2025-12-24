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
const accountKey = "CSE00081MANT0001.1.1";
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Testing Tempo Worklogs for Specific Account ===`);
console.log(`Account Key: ${accountKey}`);
console.log(`Date range: ${from} to ${to}\n`);

let allWorklogs = [];
let offset = 0;
const limit = 1000;
let hasMore = true;

async function fetchWorklogsByAccount() {
    while (hasMore) {
        const result = await new Promise((resolve, reject) => {
            // Using GET endpoint with query parameters for account
            const url = `https://api.tempo.io/4/worklogs/account/${accountKey}?from=${from}&to=${to}&limit=${limit}&offset=${offset}`;
            const req = https.request(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TEMPO_TOKEN}`
                }
            }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        console.error('Failed to parse response:', data);
                        resolve({ results: [] });
                    }
                });
            });
            req.on('error', reject);
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

    console.log(`\n=== RESULTS FOR ${accountKey} - FEBRUARY 2025 ===`);
    console.log(`Total worklogs: ${allWorklogs.length}`);
    console.log(`Total hours: ${totalHours.toFixed(2)}h`);
    console.log(`Total seconds: ${totalSeconds}`);

    // Show first 5 worklogs as sample
    if (allWorklogs.length > 0) {
        console.log(`\n=== Sample worklogs (first 5) ===`);
        allWorklogs.slice(0, 5).forEach((log, i) => {
            console.log(`\n${i + 1}. Issue: ${log.issue?.key || log.issue?.id}`);
            console.log(`   Date: ${log.startDate}`);
            console.log(`   Hours: ${(log.timeSpentSeconds / 3600).toFixed(2)}h`);
            console.log(`   Author: ${log.author?.accountId || 'N/A'}`);
            console.log(`   Description: ${(log.description || 'N/A').substring(0, 60)}`);
        });
    }
}

fetchWorklogsByAccount().catch(err => {
    console.error('Error:', err);
});
