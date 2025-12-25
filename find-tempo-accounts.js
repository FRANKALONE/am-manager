const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv(key) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return null;
        const envText = fs.readFileSync(envPath, 'utf8');
        const lines = envText.split('\n');
        for (const line of lines) {
            const [k, ...v] = line.split('=');
            if (k && k.trim() === key) {
                return v.join('=').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
            }
        }
    } catch (e) {
        console.error('Error reading .env:', e);
    }
    return null;
}

async function main() {
    const TEMPO_TOKEN = getEnv('TEMPO_API_TOKEN');
    if (!TEMPO_TOKEN) {
        console.error('TEMPO_API_TOKEN not found in .env');
        process.exit(1);
    }

    let offset = 0;
    let hasMore = true;
    const allAccounts = [];

    console.log('Fetching Tempo accounts...');

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
                res.on('data', (c) => data += c);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.end();
        });

        if (res.results && res.results.length > 0) {
            allAccounts.push(...res.results);
            if (res.results.length < 1000) hasMore = false;
            else offset += 1000;
        } else {
            hasMore = false;
        }
    }

    const matches = allAccounts.filter(acc =>
        (acc.key && acc.key.includes('APK')) ||
        (acc.name && acc.name.includes('APK')) ||
        (acc.key && acc.key.includes('00065'))
    );

    console.log('Matches found:', JSON.stringify(matches, null, 2));
}

main().catch(console.error);
