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
const targetAccountId = 1129; // CSE00081MANT0001.1.1
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Debugging Tempo API - Account Filtering ===`);
console.log(`Target Account ID: ${targetAccountId} (CSE00081MANT0001.1.1)`);
console.log(`Date range: ${from} to ${to}\n`);

let allWorklogs = [];
let offset = 0;
const limit = 100; // Smaller batch for debugging
let hasMore = true;

async function fetchWorklogs() {
    while (hasMore && offset < 200) { // Limit to 200 for debugging
        const bodyData = JSON.stringify({
            from,
            to,
            accountId: [targetAccountId]
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
            console.log(`Batch ${Math.floor(offset / limit) + 1}: ${result.results.length} worklogs`);

            if (result.results.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        } else {
            hasMore = false;
        }
    }

    // Analyze account IDs
    const accountCounts = {};
    allWorklogs.forEach(log => {
        const accountId = log.account?.id || 'NO_ACCOUNT';
        const accountKey = log.account?.key || 'NO_KEY';
        const key = `${accountId} (${accountKey})`;
        accountCounts[key] = (accountCounts[key] || 0) + 1;
    });

    console.log(`\n=== ACCOUNT DISTRIBUTION ===`);
    console.log(`Total worklogs fetched: ${allWorklogs.length}`);
    console.log(`\nWorklogs by Account ID:`);
    Object.entries(accountCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([account, count]) => {
            const hours = allWorklogs
                .filter(log => {
                    const accountId = log.account?.id || 'NO_ACCOUNT';
                    const accountKey = log.account?.key || 'NO_KEY';
                    return `${accountId} (${accountKey})` === account;
                })
                .reduce((sum, log) => sum + (log.timeSpentSeconds || 0), 0) / 3600;

            const isTarget = account.startsWith(targetAccountId.toString());
            const marker = isTarget ? ' ← TARGET' : '';
            console.log(`  ${account}: ${count} worklogs, ${hours.toFixed(2)}h${marker}`);
        });

    // Show sample worklogs for target account
    const targetWorklogs = allWorklogs.filter(log => log.account?.id === targetAccountId);
    console.log(`\n=== SAMPLE WORKLOGS FOR TARGET ACCOUNT (${targetAccountId}) ===`);
    console.log(`Found ${targetWorklogs.length} worklogs for target account in sample`);

    if (targetWorklogs.length > 0) {
        targetWorklogs.slice(0, 5).forEach((log, i) => {
            console.log(`\n${i + 1}. Issue: ${log.issue?.key || log.issue?.id}`);
            console.log(`   Account: ${log.account?.id} (${log.account?.key})`);
            console.log(`   Date: ${log.startDate}`);
            console.log(`   Hours: ${(log.timeSpentSeconds / 3600).toFixed(2)}h`);
            console.log(`   Description: ${log.description || 'N/A'}`);
        });
    }
}

fetchWorklogs().catch(err => {
    console.error('Error:', err);
});
