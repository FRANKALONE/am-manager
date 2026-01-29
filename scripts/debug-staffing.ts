import { fetchTempo } from './app/actions/analytics-annual';

async function main() {
    try {
        console.log("Fetching teams...");
        const teamsRes = await fetchTempo("/teams");
        console.log("Total teams found:", teamsRes.results?.length);

        const amaTeams = (teamsRes.results || []).filter((t: any) => t.name.startsWith("AMA"));
        console.log("AMA Teams:", amaTeams.map((t: any) => t.name));

        if (amaTeams.length > 0) {
            const team = amaTeams[0];
            console.log(`Checking memberships for team: ${team.name} (${team.id})`);

            // Try /memberships?teamId=...
            try {
                const res1 = await fetchTempo(`/memberships?teamId=${team.id}`);
                console.log("/memberships response length:", res1.results?.length);
                if (res1.results?.length > 0) {
                    console.log("Sample membership:", JSON.stringify(res1.results[0], null, 2));
                }
            } catch (e: any) {
                console.log("/memberships failed:", e.message);
            }

            // Try /teams/{id}/members
            try {
                const res2 = await fetchTempo(`/teams/${team.id}/members`);
                console.log(`/teams/${team.id}/members response length:`, res2.results?.length);
                if (res2.results?.length > 0) {
                    console.log("Sample member:", JSON.stringify(res2.results[0], null, 2));
                }
            } catch (e: any) {
                console.log(`/teams/${team.id}/members failed:`, e.message);
            }
        }
    } catch (err) {
        console.error("Critical error:", err);
    }
}

main();
