import { fetchTempo } from './lib/tempo';

async function main() {
    try {
        console.log("Fetching teams...");
        const teamsRes = await fetchTempo("/teams");
        console.log("Total teams found:", teamsRes.results?.length);

        const amaTeams = (teamsRes.results || []).filter((t: any) => t.name.startsWith("AMA"));
        console.log("AMA Teams:", JSON.stringify(amaTeams.map((t: any) => ({ id: t.id, name: t.name })), null, 2));

        if (amaTeams.length > 0) {
            const team = amaTeams[0];
            console.log(`Checking membership endpoints for team: ${team.name} (${team.id})`);

            const endpoints = [
                `/team-memberships/team/${team.id}`,
                `/memberships?teamId=${team.id}`,
                `/teams/${team.id}/members`
            ];

            for (const ep of endpoints) {
                try {
                    console.log(`Testing: ${ep}`);
                    const res = await fetchTempo(ep);
                    console.log(`  Success! Results: ${res.results?.length || res.length || 'unknown'}`);
                    if (res.results?.length > 0) {
                        console.log(`  Sample: ${JSON.stringify(res.results[0], null, 2).substring(0, 200)}...`);
                    }
                } catch (e: any) {
                    console.log(`  Failed: ${e.message}`);
                }
            }
        }
    } catch (err) {
        console.error("Critical error:", err);
    }
}

main();
