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
        const amaTeams = teamsRes.results.filter(t => t.name.startsWith("AMA"));

        for (const team of amaTeams) {
            console.log(`--- Team: ${team.name} (${team.id}) ---`);
            const ep = `/team-memberships/team/${team.id}`;
            const res = await fetchTempo(ep, token);
            const items = res.results || res;

            if (items && items.length > 0) {
                const item = items[0];
                console.log("Keys in root:", Object.keys(item));

                // Check common date fields locations
                const paths = [
                    'from', 'to',
                    'membership.from', 'membership.to',
                    'commitment.from', 'commitment.to',
                    'validFrom', 'validTo'
                ];

                function getVal(obj, path) {
                    return path.split('.').reduce((o, key) => (o && o[key] !== 'undefined') ? o[key] : undefined, obj);
                }

                paths.forEach(p => {
                    const val = getVal(item, p);
                    if (val !== undefined) console.log(`  Path [${p}]: ${val}`);
                });

                if (item.membership) console.log("  Membership keys:", Object.keys(item.membership));
                if (item.member) console.log("  Member keys:", Object.keys(item.member));
            } else {
                console.log("  No memberships found");
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();
