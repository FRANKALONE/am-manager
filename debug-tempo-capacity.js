
const https = require('https');
require('dotenv').config();

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const TEMPO_BASE_URL = 'api.tempo.io';

async function fetchTempo(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TEMPO_BASE_URL,
            port: 443,
            path: '/4' + path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        console.log("--- WORKLOAD SCHEMES ---");
        const schemes = await fetchTempo('/workload-schemes');
        console.log(JSON.stringify(schemes, null, 2));

        if (schemes.results && schemes.results.length > 0) {
            for (const scheme of schemes.results) {
                console.log(`\n--- MEMBERS FOR SCHEME ${scheme.name} (${scheme.id}) ---`);
                const members = await fetchTempo(`/workload-schemes/${scheme.id}/members`);
                console.log(`Count: ${members.results.length}`);
                if (members.results.length > 0) {
                    console.log("Example member:", members.results[0].accountId);
                }
            }
        }
    } catch (e) {
        console.error("FAIL:", e.message);
    }
}

main();
