const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function debugTicketCount() {
    console.log('=== Debugging Ticket Count ===\n');

    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'IMPREX' } },
        include: {
            validityPeriods: { orderBy: { startDate: 'asc' } },
            tickets: true
        }
    });

    console.log('WP:', wp.name);
    console.log('Project Keys:', wp.jiraProjectKeys);
    console.log('\nValidity Periods:');
    wp.validityPeriods.forEach(p => {
        console.log(`  ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`);
    });

    console.log(`\nTickets in DB: ${wp.tickets.length}`);

    // Test JIRA query for April-November 2025
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    // Query for all tickets in 2025
    const jql = `project in (IMP) AND created >= "2025-04-01" AND created <= "2025-11-30"`;

    console.log('\n📡 Testing JIRA query:');
    console.log('JQL:', jql);

    const searchUrl = new URL(`${jiraUrl}/rest/api/3/search/jql`);
    searchUrl.searchParams.append('jql', jql);
    searchUrl.searchParams.append('maxResults', '100');
    searchUrl.searchParams.append('fields', 'key,issuetype,created');

    const result = await new Promise((resolve) => {
        const req = https.request({
            hostname: searchUrl.hostname,
            port: 443,
            path: searchUrl.pathname + searchUrl.search,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'Parse error' });
                }
            });
        });
        req.on('error', (err) => resolve({ error: err.message }));
        req.end();
    });

    console.log('\n📊 JIRA Results:');
    console.log('Total issues:', result.issues?.length || 0);

    if (result.issues) {
        // Group by issue type
        const byType = {};
        result.issues.forEach(issue => {
            const type = issue.fields.issuetype.name;
            if (!byType[type]) byType[type] = 0;
            byType[type]++;
        });

        console.log('\nBy Issue Type:');
        Object.keys(byType).sort().forEach(type => {
            console.log(`  ${type}: ${byType[type]}`);
        });

        // Check which types are being filtered
        const filtered = ['Incidencia', 'Correctivo', 'Consulta', 'Solicitud de Servicio'];
        console.log('\n🔍 Filtered types (what we sync):');
        filtered.forEach(type => {
            const count = byType[type] || 0;
            console.log(`  ${type}: ${count}`);
        });

        const totalFiltered = filtered.reduce((sum, type) => sum + (byType[type] || 0), 0);
        console.log(`\nTotal after filter: ${totalFiltered}`);
        console.log(`Missing: ${result.issues.length - totalFiltered}`);
    }

    await prisma.$disconnect();
}

debugTicketCount().catch(console.error);
