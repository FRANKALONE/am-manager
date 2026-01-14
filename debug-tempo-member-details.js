
const https = require('https');
require('dotenv').config();

const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const TEMPO_BASE_URL = 'api.tempo.io';

async function fetchTempo(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TEMPO_BASE_URL,
            port: 443,
            path: '/v4' + path,
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
        const teams = await fetchTempo('/teams');
        if (teams.results && teams.results.length > 0) {
            const teamId = teams.results[0].id;
            console.log(`Checking members for team: ${teams.results[0].name} (${teamId})`);
            const members = await fetchTempo(`/teams/${teamId}/members`);
            console.log("Member data example:");
            console.log(JSON.stringify(members.results[0], null, 2));

            const accountId = members.results[0].member.accountId;
            console.log(`\nChecking schedule for user: ${accountId}`);
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
            const schedule = await fetchTempo(`/user-schedule/${accountId}?from=${today}&to=${nextWeek}`);
            console.log("Schedule data:");
            console.log(JSON.stringify(schedule, null, 2));
        }
    } catch (e) {
        console.error("FAIL:", e.message);
    }
}

main();
