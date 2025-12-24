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
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("--- TEST: Tempo Attribute Filter & Limit ---");
    const accountKey = "CSE00081MANT0001.1.1";
    const from = "2025-02-01";
    const to = "2025-02-28";

    // Test 1: Attribute Filter in Body?
    // Some docs suggest: 
    // filter: { attributes: ... } ? No.
    // Use 'workerId'? No.
    // Let's try adding 'attributes' to top level logic? Or 'workAttributeId'?
    // Guessing structure based on common Jira/Tempo patterns

    // Attempt A: workAttributeValues (Used in some versions)
    // Attempt B: attributes (Generic)

    const bodyA = {
        from, to,
        limit: 1000,
        // Guessing Key Name
        attributes: [{ key: "_Cliente_", value: accountKey }]
    };

    console.log("Attempt A (attributes array):");
    const resA = await fetchTempo(`/worklogs/search?limit=1000`, bodyA);
    console.log(`Count A: ${resA.results?.length}`);
    if (resA.results && resA.results.length > 0) {
        console.log("Sample A:", JSON.stringify(resA.results[0].attributes?.values));
    }

    // Test 2: Verify LIMIT
    // If A returned 1000 (meaning filter ignored), check if it really is 1000 or 50.
    if (resA.results) {
        console.log(`Returned ${resA.results.length} items. (Requested limit 1000)`);
        if (resA.results.length === 50 && resA.metadata?.count > 50) {
            console.error("CRITICAL: API ignored limit=1000, returned 50. Pagination loop will be 20x slower!");
        }
    }

}

run();
