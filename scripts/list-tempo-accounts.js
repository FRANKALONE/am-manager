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

console.log(`\n=== Fetching Tempo Accounts ===\n`);

// First, let's get all accounts to find the right one
https.request('https://api.tempo.io/4/accounts', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log(`Total accounts: ${parsed.results?.length || 0}\n`);

            // Look for account with ID 1129 or related to CSE00081MANT0001
            const accounts = parsed.results || [];
            const filtered = accounts.filter(acc =>
                acc.id === 1129 ||
                acc.id === '1129' ||
                acc.key?.includes('CSE00081') ||
                acc.name?.includes('CSE00081')
            );

            console.log(`Matching accounts:`);
            filtered.forEach(acc => {
                console.log(`\n  ID: ${acc.id}`);
                console.log(`  Key: ${acc.key}`);
                console.log(`  Name: ${acc.name}`);
                console.log(`  Status: ${acc.status}`);
            });

            // Show first 10 accounts as reference
            console.log(`\n\n=== First 10 accounts (for reference) ===`);
            accounts.slice(0, 10).forEach(acc => {
                console.log(`\n  ID: ${acc.id} | Key: ${acc.key} | Name: ${acc.name}`);
            });

        } catch (e) {
            console.error('Failed to parse response:', e);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error('Request error:', e);
}).end();
