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
        console.log("Testing Body:", JSON.stringify(body, null, 2));

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
                if (res.statusCode >= 300) {
                    console.log("Status:", res.statusCode);
                    console.log("Response:", data);
                }
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
    const from = "2025-02-01";
    const to = "2025-02-28";
    const wpId = "CSE00081MANT0001.1.1";

    // Attempt 1: Standard attribute filter structure (common in APIs)
    const body1 = {
        from, to,
        projectKey: ["EUR"],
        limit: 50,
        // Guessing the field name based on standard patterns or v3/v4 docs knowledge
        // Often "worker" or "account" are top level. Attributes might be separate.
        // Let's try 'updatedFrom' just to see if it works? No we need attribute.
        // Let's try passing the attribute constraint.
    };

    // There is NO standard documented way to filter by Work Attribute in /worklogs/search V4 
    // without retrieving them first, UNLESS it's managed as an Account.
    // Let's Try "Account Key" assuming the WP ID might be an Account Key?

    console.log("--- TEST 1: Filter by Account Key ---");
    const bodyAccount = { ...body1, accountKey: [wpId] };
    const resAccount = await fetchTempo("/worklogs/search", bodyAccount);
    console.log(`Results (Account Filter): ${resAccount.results?.length}`);

    // Attempt 2: Filter by 'filter' object?
    // Not standard.

    // Conclusion: If Tempo API doesn't support server-side attribute filtering for Worklogs Search,
    // we are stuck with fetching all PROJECT logs.
    // BUT maybe "EUR" project is too big. 
    // Is there an "Account" linked to "EuropeSnacks"? 
    // If the "CSE..." ID is actually an Account Key in Tempo, Test 1 will work.
}

run();
