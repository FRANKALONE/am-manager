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
        process.exit(1);
    }

    const accountKey = 'AMA00065MANT0001.1.1';
    const from = '2025-11-01';
    const to = '2026-10-31';

    console.log(`Fetching worklogs for KEY ${accountKey}...`);
    const resKey = await new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/worklogs/account/${accountKey}?from=${from}&to=${to}&limit=100`;
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
    });

    if (resKey.data.results) {
        console.log(JSON.stringify(resKey.data.results, null, 2));
    }
}

main().catch(console.error);
