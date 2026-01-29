const fs = require('fs');
const path = require('path');

function getEnvToken() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/TEMPO_API_TOKEN=["']?([^"'\n]+)["']?/);
        return match ? match[1] : null;
    }
    return null;
}

async function fetchTempo(endpoint, token) {
    const TEMPO_API_BASE = "https://api.tempo.io/4";
    const url = `${TEMPO_API_BASE}${endpoint}`;
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Tempo API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    return response.json();
}

async function main() {
    const token = getEnvToken();
    if (!token) {
        console.error("TEMPO_API_TOKEN not found in .env");
        process.exit(1);
    }

    try {
        console.log("Fetching teams...");
        const teamsRes = await fetchTempo("/teams", token);
        const amaTeams = (teamsRes.results || []).filter(t => t.name.startsWith("AMA"));
        console.log("AMA Teams found:", amaTeams.length);

        if (amaTeams.length > 0) {
            const team = amaTeams[0];
            console.log(`Checking membership endpoints for team: ${team.name} (${team.id})`);

            // Try different variations of membership endpoints
            const endpoints = [
                `/team-memberships/team/${team.id}`, // Often used in Cloud
                `/memberships?teamId=${team.id}`,
                `/teams/${team.id}/members`
            ];

            for (const ep of endpoints) {
                try {
                    console.log(`Testing: ${ep}`);
                    const res = await fetchTempo(ep, token);
                    const count = res.results ? res.results.length : (Array.isArray(res) ? res.length : 'unknown');
                    console.log(`  Success! Results length: ${count}`);
                    if (res.results && res.results.length > 0) {
                        const m = res.results[0].member || res.results[0];
                        console.log(`  Sample accountId: ${m.accountId || m.member?.accountId}`);
                        console.log(`  From: ${res.results[0].from}, To: ${res.results[0].to}`);
                    }
                } catch (e) {
                    console.log(`  Failed: ${e.message}`);
                }
            }
        }
    } catch (err) {
        console.error("Critical error:", err.message);
    }
}

main();
