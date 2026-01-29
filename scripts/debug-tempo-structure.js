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
    const headers = { "Authorization": `Bearer ${token}`, "Accept": "application/json" };
    const response = await fetch(url, { headers });
    return response.json();
}

async function main() {
    const token = getEnvToken();
    try {
        const teamsRes = await fetchTempo("/teams", token);
        const team = teamsRes.results.find(t => t.name.startsWith("AMA"));
        console.log(`Team: ${team.name} (${team.id})`);

        const ep = `/team-memberships/team/${team.id}`;
        console.log(`Testing: ${ep}`);
        const res = await fetchTempo(ep, token);

        const results = res.results || res;
        console.log("Full structure of first item:");
        console.log(JSON.stringify(results[0], null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
