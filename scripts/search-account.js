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

console.log(`\n=== Searching for CSE00081MANT0001 in Tempo Accounts ===\n`);

https.request('https://api.tempo.io/4/accounts?limit=1000', {
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
            const accounts = parsed.results || [];

            console.log(`Total accounts: ${accounts.length}\n`);

            // Search for CSE00081
            const matches = accounts.filter(acc =>
                acc.key?.includes('CSE00081') ||
                acc.name?.includes('CSE00081') ||
                acc.key?.includes('1129') ||
                acc.id === 1129
            );

            if (matches.length > 0) {
                console.log(`Found ${matches.length} matching account(s):\n`);
                matches.forEach(acc => {
                    console.log(`  ID: ${acc.id}`);
                    console.log(`  Key: ${acc.key}`);
                    console.log(`  Name: ${acc.name}`);
                    console.log(`  Status: ${acc.status}`);
                    console.log(`  Lead: ${acc.lead?.displayName || 'N/A'}`);
                    console.log('');
                });
            } else {
                console.log(`No accounts found matching 'CSE00081' or '1129'\n`);
                console.log(`Showing ALL accounts:\n`);
                accounts.forEach(acc => {
                    console.log(`  ID: ${acc.id} | Key: ${acc.key} | Name: ${acc.name}`);
                });
            }

        } catch (e) {
            console.error('Failed to parse response:', e);
            console.log('Raw response:', data.substring(0, 1000));
        }
    });
}).on('error', (e) => {
    console.error('Request error:', e);
}).end();
