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

async function testTempoAccountFilter() {
    const accountId = 1129; // CSE00081MANT0001.1.1
    const accountKey = "CSE00081MANT0001.1.1";

    console.log(`Testing Tempo worklog search with Account ID: ${accountId}`);
    console.log(`Account Key: ${accountKey}\n`);

    // Test 1: Try with accountId
    console.log("Test 1: Using accountId parameter...");
    const bodyData1 = JSON.stringify({
        from: "2025-01-01",
        to: "2025-12-31",
        accountId: [accountId],
        limit: 50
    });

    const res1 = await new Promise((resolve, reject) => {
        const req = https.request('https://api.tempo.io/4/worklogs/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(bodyData1);
        req.end();
    });

    if (res1.results) {
        console.log(`  Results: ${res1.results.length} logs`);
        if (res1.results.length > 0) {
            const sample = res1.results[0];
            console.log(`  Sample issue ID: ${sample.issue.id}`);
            console.log(`  Sample _Cliente_: ${sample.attributes?.values?.find(a => a.key === "_Cliente_")?.value || "N/A"}`);
        }
    }
    console.log("");

    // Test 2: Try with accountKey
    console.log("Test 2: Using accountKey parameter...");
    const bodyData2 = JSON.stringify({
        from: "2025-01-01",
        to: "2025-12-31",
        accountKey: [accountKey],
        limit: 50
    });

    const res2 = await new Promise((resolve, reject) => {
        const req = https.request('https://api.tempo.io/4/worklogs/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(bodyData2);
        req.end();
    });

    if (res2.results) {
        console.log(`  Results: ${res2.results.length} logs`);
        if (res2.results.length > 0) {
            const sample = res2.results[0];
            console.log(`  Sample issue ID: ${sample.issue.id}`);
            console.log(`  Sample _Cliente_: ${sample.attributes?.values?.find(a => a.key === "_Cliente_")?.value || "N/A"}`);
        }
    }
}

testTempoAccountFilter();
