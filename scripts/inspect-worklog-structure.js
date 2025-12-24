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
const from = "2025-02-01";
const to = "2025-02-28";

console.log(`\n=== Inspecting Tempo Worklog Structure ===`);
console.log(`Date range: ${from} to ${to}\n`);

async function fetchAndInspect() {
    const bodyData = JSON.stringify({
        from,
        to
    });

    const result = await new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/worklogs/search?limit=5&offset=0`;
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
        console.log(`Fetched ${result.results.length} sample worklogs\n`);
        console.log('=== FULL STRUCTURE OF FIRST WORKLOG ===');
        console.log(JSON.stringify(result.results[0], null, 2));

        console.log('\n\n=== KEYS AVAILABLE IN WORKLOGS ===');
        const allKeys = new Set();
        result.results.forEach(log => {
            Object.keys(log).forEach(key => allKeys.add(key));
        });
        console.log(Array.from(allKeys).sort().join(', '));
    }
}

fetchAndInspect().catch(err => {
    console.error('Error:', err);
});
