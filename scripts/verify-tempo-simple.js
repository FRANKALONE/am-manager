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

async function fetchTempo(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4${endpoint}`;

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("--- TEST: Simple Tempo Query (Feb 2025) ---");
    const accountKey = "CSE00081MANT0001.1.1";
    const from = "2025-02-01";
    const to = "2025-02-28";

    // Pagination Loop
    let allResults = [];
    let offset = 0;
    let limit = 1000;
    let hasMore = true;

    const start = Date.now();

    while (hasMore) {
        const body = {
            from,
            to,
            accountKey: [accountKey],
            offset,
            limit
        };

        process.stdout.write(`Fetching offset ${offset}... `);
        const res = await fetchTempo(`/worklogs/search?limit=${limit}`, body);

        if (res.results) {
            console.log(`Got ${res.results.length}`);
            allResults = [...allResults, ...res.results];
            if (res.results.length < limit) hasMore = false;
            else offset += limit;
        } else {
            console.log("Error or Empty:", res);
            hasMore = false;
        }
    }

    const duration = (Date.now() - start) / 1000;
    console.log(`\nDONE in ${duration}s.`);
    console.log(`Total Logs Feb 2025: ${allResults.length}`);

    // Optional: Check attributes of first few
    if (allResults.length > 0) {
        const sample = allResults[0];
        console.log("Sample Log Attribute:", JSON.stringify(sample.attributes?.values));
    }
}

run();
