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

console.log(`\n=== Testing Tempo Accounts API ===`);
console.log(`Target Account ID: ${targetAccountId}\n`);

async function getAccountDetails() {
    // Get specific account details
    const accountResult = await new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/accounts/${targetAccountId}`;
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
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Failed to parse account response');
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });

    if (accountResult) {
        console.log('=== ACCOUNT DETAILS ===');
        console.log(JSON.stringify(accountResult, null, 2));
    }
}

getAccountDetails().catch(err => {
    console.error('Error:', err);
});
