
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

async function testTempoAccount() {
    const wpId = "CSE00081MANT0001.1.1";
    console.log(`Testing Tempo Direct Search for WP: ${wpId}`);
    console.log("Date Range: Full Year 2025 (Jan-Dec)");
    console.log("Using _Cliente_ attribute filter...\n");

    const bodyData = JSON.stringify({
        from: "2025-01-01",
        to: "2025-12-31",
        limit: 1000  // Increased to get more results
    });

    const res = await new Promise((resolve, reject) => {
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
        req.write(bodyData);
        req.end();
    });

    console.log("Status:", res.results ? "OK" : "Error");
    if (res.results) {
        console.log(`Total logs found: ${res.results.length}`);

        // Filter by _Cliente_ attribute
        const filtered = res.results.filter(log => {
            const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
            return clientAttr && clientAttr.value === wpId;
        });

        console.log(`Logs matching _Cliente_ = "${wpId}": ${filtered.length}`);

        if (filtered.length > 0) {
            console.log("\nSample matching log:");
            console.log(JSON.stringify(filtered[0], null, 2));

            // Calculate total hours
            const totalSeconds = filtered.reduce((sum, log) => sum + log.timeSpentSeconds, 0);
            const totalHours = totalSeconds / 3600;
            console.log(`\nTotal hours for this WP in Sep 2025: ${totalHours.toFixed(2)}h`);
        } else {
            console.log("\nNo logs found with matching _Cliente_ attribute.");
            console.log("Sample of _Cliente_ values found:");
            const clientValues = new Set();
            res.results.slice(0, 10).forEach(log => {
                const clientAttr = log.attributes?.values?.find(a => a.key === "_Cliente_");
                if (clientAttr) clientValues.add(clientAttr.value);
            });
            console.log([...clientValues]);
        }
    } else {
        console.log("Error Response:", JSON.stringify(res, null, 2));
    }
}

testTempoAccount();
