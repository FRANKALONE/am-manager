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

async function countLogs(body, label) {
    return new Promise((resolve, reject) => {
        // limit=100 just to see if it saturates
        const url = `https://api.tempo.io/4/worklogs/search?limit=100`;
        console.log(`\n--- TEST: ${label} ---`);
        console.log("Body:", JSON.stringify(body));

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
                const json = JSON.parse(data);
                console.log(`Results: ${json.results?.length}`);
                resolve();
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    const from = "2025-02-01";
    const to = "2025-02-28";
    const wpId = "CSE00081MANT0001.1.1";
    const project = "EUR";

    // TEST 1: Both
    await countLogs({ from, to, projectKey: [project], accountKey: [wpId] }, "Project AND Account");

    // TEST 2: Account Only
    await countLogs({ from, to, accountKey: [wpId] }, "Account ONLY");
}

run();
