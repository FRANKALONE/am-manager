require('dotenv').config();
const https = require('https');
const tempoToken = process.env.TEMPO_API_TOKEN?.trim();

async function fetchWorklogsByAccount(accountId, from, to) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/worklogs/account/${accountId}?from=${from}&to=${to}`;
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tempoToken}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        const from = '2025-12-01';
        const to = '2025-12-31';
        const accounts = [
            'AMA30313MANT0001.1.1', // Found in Tempo
            'AMA30313MANT0001.1.2', // Database WP ID
            'CSE30313MANT0001.1.1'  // Old WP ID
        ];

        for (const acc of accounts) {
            console.log(`\n--- Account: ${acc} (${from} to ${to}) ---`);
            const res = await fetchWorklogsByAccount(acc, from, to);
            if (res.results) {
                console.log(`Found ${res.results.length} worklogs total.`);
                res.results.forEach(log => {
                    const marker = ['FUE-724', 'FUE-728', 'FUE-729'].includes(log.issue?.key) ? ' *** TARGET ***' : '';
                    console.log(`  - ${log.startDate}: ${(log.timeSpentSeconds / 3600).toFixed(2)}h on ${log.issue?.key} | ${log.author?.displayName}${marker}`);
                });
            } else {
                console.log('Error or no results:', res);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
