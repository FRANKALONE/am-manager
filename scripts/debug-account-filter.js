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

async function fetchTempo(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    const from = "2025-02-01";
    const to = "2025-02-28";

    // 1. Control: Search NON_EXISTENT Account
    console.log(`\nTest 1: Search 'NON_EXISTENT_KEY'`);
    const res1 = await fetchTempo(`/worklogs/search?limit=100`, 'POST', {
        from, to, accountKey: ["NON_EXISTENT_KEY"]
    });
    console.log(`Result 1: ${res1.results?.length}`); // Should be 0

    // 2. Control: Search 'CSE...' Account (String)
    console.log(`\nTest 2: Search 'CSE00081MANT0001.1.1'`);
    const res2 = await fetchTempo(`/worklogs/search?limit=100`, 'POST', {
        from, to, accountKey: ["CSE00081MANT0001.1.1"]
    });
    console.log(`Result 2: ${res2.results?.length}`); // If 100, checking meta to see absolute total?
    // Tempo V4 doesn't return total in search usually.

    // 3. List Accounts (Search for CSE...)
    // GET /accounts?query=... is common? Or just GET /accounts
    console.log(`\nTest 3: Search Accounts for 'CSE...'`);
    // Tempo Accounts API usually /accounts
    // But pagination...
    // Let's try searching
    const res3 = await fetchTempo(`/accounts/search`, 'POST', {
        searchQuery: "CSE00081MANT0001.1.1"
    }).catch(e => ({ results: [] })); // Might fail if endpoint wrong

    if (res3.results && res3.results.length > 0) {
        console.log(`Found Account:`, res3.results[0]);
    } else {
        console.log("No Account found via /accounts/search using 'CSE...'");
        // Try simple GET /accounts?
        // const res4 = await fetchTempo(`/accounts?limit=1000`); // Assuming we can find it in list
    }
}

run();
