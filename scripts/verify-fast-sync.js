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

async function getWorklogsReplica(from, to, projectKey, accountKey) {
    const limit = 1000;
    const body = {
        from,
        to,
        limit,
        offset: 0
    };

    if (projectKey) {
        body.projectKey = [projectKey];
    }

    if (accountKey) {
        body.accountKey = Array.isArray(accountKey) ? accountKey : [accountKey];
    }

    let allResults = [];
    let hasMore = true;
    let pages = 0;

    console.log(`Starting Fetch: project=${projectKey}, account=${accountKey}`);
    const start = Date.now();

    while (hasMore) {
        // EXACT REPLICA OF THE FIX: limit in URL
        const endpoint = `/worklogs/search?limit=${limit}`;
        process.stdout.write(`Page ${pages + 1} (offset ${body.offset})... `);

        const response = await fetchTempo(endpoint, body);
        const results = response.results || [];
        console.log(`Got ${results.length}`);

        allResults = [...allResults, ...results];
        pages++;

        if (results.length < limit) {
            hasMore = false;
        } else {
            body.offset += limit;
        }
    }

    const duration = (Date.now() - start) / 1000;
    console.log(`\nDone in ${duration}s. Total Records: ${allResults.length}`);
    return allResults;
}

async function run() {
    // Test with the problematic Case
    const wpId = "CSE00081MANT0001.1.1";
    // Using FULL year range to stress test
    await getWorklogsReplica("2025-02-01", "2026-01-31", "EUR", wpId);
}

run();
