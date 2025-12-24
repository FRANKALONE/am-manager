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

async function testTempoAccounts() {
    console.log("Fetching Tempo Accounts to find the correct one...\n");

    const res = await new Promise((resolve, reject) => {
        const req = https.request('https://api.tempo.io/4/accounts', {
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

    if (res.results) {
        console.log(`Total accounts found: ${res.results.length}\n`);

        // Search for accounts matching our WP ID
        const wpId = "CSE00081MANT0001.1.1";
        const matching = res.results.filter(acc =>
            acc.key === wpId ||
            acc.name?.includes("CSE00081") ||
            acc.id === wpId
        );

        if (matching.length > 0) {
            console.log("Matching accounts found:");
            matching.forEach(acc => {
                console.log(`  - Key: ${acc.key}`);
                console.log(`    ID: ${acc.id}`);
                console.log(`    Name: ${acc.name}`);
                console.log(`    Status: ${acc.status}`);
                console.log("");
            });
        } else {
            console.log("No exact match found. Showing first 10 accounts:");
            res.results.slice(0, 10).forEach(acc => {
                console.log(`  - Key: ${acc.key}, Name: ${acc.name}`);
            });
        }
    } else {
        console.log("Error:", JSON.stringify(res, null, 2));
    }
}

testTempoAccounts();
