const { fetchTempo } = require('../lib/tempo');

async function checkStaffing() {
    try {
        console.log("Checking Tempo Teams...");
        const teamsRes = await fetchTempo("/teams");
        const teams = teamsRes.results || [];
        console.log(`Found ${teams.length} teams in total.`);

        const amaTeams = teams.filter(t => t.name.startsWith("AMA"));
        console.log(`Found ${amaTeams.length} AMA teams:`, amaTeams.map(t => t.name));

        if (amaTeams.length > 0) {
            const team = amaTeams[0];
            console.log(`Checking memberships for team: ${team.name} (${team.id})`);
            const membershipsRes = await fetchTempo(`/team-memberships/team/${team.id}`);
            const members = membershipsRes.results || [];
            console.log(`Found ${members.length} members.`);
            if (members.length > 0) {
                console.log("Sample membership:", JSON.stringify(members[0], null, 2));
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkStaffing();
