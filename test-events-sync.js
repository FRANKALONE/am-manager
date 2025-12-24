const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');

const prisma = new PrismaClient();

async function testEventsSync() {
    console.log('=== Testing Events Sync ===\n');

    // 1. Find IMPREX WP
    const wp = await prisma.workPackage.findFirst({
        where: {
            name: { contains: 'IMPREX' }
        }
    });

    if (!wp) {
        console.log('❌ WP not found');
        return;
    }

    console.log(`✅ Found WP: ${wp.name}`);
    console.log(`   ID: ${wp.id}`);
    console.log(`   Contract Type: ${wp.contractType}`);
    console.log(`   Contract Type (upper): ${wp.contractType?.toUpperCase()}`);
    console.log(`   Is EVENTOS?: ${wp.contractType?.toUpperCase() === 'EVENTOS'}`);

    // 2. Check JIRA credentials
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    console.log(`\n✅ JIRA URL: ${jiraUrl ? 'Set' : 'Missing'}`);
    console.log(`✅ JIRA Email: ${jiraEmail ? 'Set' : 'Missing'}`);
    console.log(`✅ JIRA Token: ${jiraToken ? 'Set' : 'Missing'}`);

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.log('\n❌ Missing JIRA credentials');
        return;
    }

    // 3. Check project keys
    const projectKeys = wp.jiraProjectKeys?.split(',').map(k => k.trim()).join(', ') || '';
    console.log(`\n✅ Project Keys: ${projectKeys}`);

    if (!projectKeys) {
        console.log('❌ No project keys configured');
        return;
    }

    // 4. Get validity periods
    const validityPeriods = await prisma.validityPeriod.findMany({
        where: { workPackageId: wp.id },
        orderBy: { startDate: 'asc' }
    });

    console.log(`\n✅ Validity Periods: ${validityPeriods.length}`);
    validityPeriods.forEach(p => {
        console.log(`   - ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`);
    });

    // 5. Test JIRA API call for first period
    if (validityPeriods.length > 0) {
        const period = validityPeriods[0];
        const startDateStr = period.startDate.toISOString().split('T')[0];
        const endDateStr = period.endDate.toISOString().split('T')[0];

        const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")`;

        console.log(`\n📡 Testing JIRA API call...`);
        console.log(`   JQL: ${jql}`);

        const searchUrl = new URL(`${jiraUrl}/rest/api/3/search/jql`);
        searchUrl.searchParams.append('jql', jql);
        searchUrl.searchParams.append('maxResults', '10');
        searchUrl.searchParams.append('fields', 'key,summary,issuetype,created');

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
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, error: 'Parse error', raw: data.substring(0, 200) });
                    }
                });
            });
            req.on('error', (err) => resolve({ error: err.message }));
            req.end();
        });

        console.log(`\n📊 JIRA API Response:`);
        console.log(`   Status: ${result.status}`);
        if (result.data) {
            console.log(`   Issues: ${result.data.issues?.length || 0}`);
            if (result.data.issues && result.data.issues.length > 0) {
                console.log(`\n   First ticket: ${result.data.issues[0].key}`);
            }
            if (result.data.errorMessages) {
                console.log(`   Errors: ${JSON.stringify(result.data.errorMessages)}`);
            }
        } else if (result.error) {
            console.log(`   Error: ${result.error}`);
            if (result.raw) console.log(`   Raw: ${result.raw}`);
        }
    }

    await prisma.$disconnect();
}

testEventsSync().catch(console.error);
