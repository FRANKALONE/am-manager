require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

async function fixResolutions() {
    console.log('--- START RESOLUTION FIX ---');

    const jiraUrl = process.env.JIRA_URL?.trim();
    if (!jiraUrl) {
        console.error('ERROR: JIRA_URL not found in environment');
        return;
    }

    // Find all tickets with null resolution created in 2025
    // Flexible status matching
    const tickets = await prisma.ticket.findMany({
        where: {
            year: 2025,
            resolution: null,
            status: { in: ['Cerrado', 'Resuelto', 'Done', 'Finished', 'Closed', 'Resolved'], mode: 'insensitive' }
        },
        select: {
            issueKey: true
        }
    });

    console.log(`Found ${tickets.length} potential tickets to fix.`);

    if (tickets.length === 0) {
        console.log('No tickets to fix.');
        return;
    }

    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const batchSize = 50;
    for (let i = 0; i < tickets.length; i += batchSize) {
        const batch = tickets.slice(i, i + batchSize);
        const keys = batch.map(t => t.issueKey);

        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(tickets.length / batchSize)}...`);

        const payload = JSON.stringify({
            jql: `key in (${keys.map(k => `"${k}"`).join(',')})`,
            maxResults: 100,
            fields: ['resolution']
        });

        try {
            const jiraRes = await new Promise((resolve, reject) => {
                const req = https.request(`${jiraUrl}/rest/api/3/search`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (c) => data += c);
                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) resolve(JSON.parse(data));
                            else {
                                console.error(`Jira API error ${res.statusCode}: ${data}`);
                                resolve({ issues: [] });
                            }
                        } catch (e) { resolve({ issues: [] }); }
                    });
                });
                req.on('error', (e) => reject(e));
                req.write(payload);
                req.end();
            });

            if (jiraRes.issues && jiraRes.issues.length > 0) {
                for (const issue of jiraRes.issues) {
                    const resolutionName = issue.fields.resolution?.name || null;
                    if (resolutionName) {
                        await prisma.ticket.updateMany({
                            where: { issueKey: issue.key },
                            data: { resolution: resolutionName }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error in batch:', error);
        }
    }

    console.log('--- END RESOLUTION FIX ---');
    await prisma.$disconnect();
}

fixResolutions().catch(console.error);
