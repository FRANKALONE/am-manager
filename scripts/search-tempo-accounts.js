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

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;

async function searchTempoAccounts() {
    console.log("Searching ALL Tempo Accounts for CSE or 00081...\n");

    let offset = 0;
    let hasMore = true;
    let allAccounts = [];

    while (hasMore) {
        const res = await new Promise((resolve, reject) => {
            const req = https.request(`https://api.tempo.io/4/accounts?offset=${offset}&limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TEMPO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.end();
        });

        if (res.results && res.results.length > 0) {
            allAccounts = [...allAccounts, ...res.results];
            if (res.results.length < 1000) {
                hasMore = false;
            } else {
                offset += 1000;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`Total accounts fetched: ${allAccounts.length}\n`);

    // Search for CSE or 00081
    const cseAccounts = allAccounts.filter(acc =>
        acc.key?.includes("CSE") ||
        acc.key?.includes("00081") ||
        acc.name?.includes("CSE") ||
        acc.name?.includes("00081") ||
        acc.name?.includes("EUROPESNACKS")
    );

    console.log(`Accounts matching CSE/00081/EUROPESNACKS: ${cseAccounts.length}\n`);
    cseAccounts.forEach(acc => {
        console.log(`Key: ${acc.key}`);
        console.log(`ID: ${acc.id}`);
        console.log(`Name: ${acc.name}`);
        console.log(`Status: ${acc.status}`);
        console.log(`---`);
    });
}

searchTempoAccounts();
