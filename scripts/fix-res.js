require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

async function fixResolutions() {
    console.log('--- START RESOLUTION FIX ---');

    let jiraUrl = process.env.JIRA_URL?.trim() || 'https://altim.atlassian.net';
    if (jiraUrl.endsWith('/')) jiraUrl = jiraUrl.slice(0, -1);

    const issues = await prisma.ticket.findMany({
        where: {
            year: 2025,
            resolution: null,
            status: { in: ['Cerrado', 'Resuelto', 'Done', 'Finished', 'Closed', 'Resolved'], mode: 'insensitive' }
        },
        select: { issueKey: true }
    });

    console.log(`Potential tickets: ${issues.length}`);
    if (issues.length === 0) return;

    const auth = Buffer.from(`${process.env.JIRA_USER_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const batchSize = 50;
    for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        const keys = batch.map(t => t.issueKey);

        const payload = JSON.stringify({
            jql: `key in (${keys.map(k => `"${k}"`).join(',')})`,
            fields: ['resolution']
        });

        const res = await new Promise((resolve) => {
            const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }, (r) => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => resolve({ status: r.statusCode, data: d }));
            });
            req.on('error', () => resolve({ status: 500, data: '' }));
            req.write(payload);
            req.end();
        });

        if (res.status === 200) {
            const data = JSON.parse(res.data);
            for (const issue of data.issues) {
                if (issue.fields.resolution) {
                    await prisma.ticket.updateMany({
                        where: { issueKey: issue.key },
                        data: { resolution: issue.fields.resolution.name }
                    });
                }
            }
            console.log(`Processed batch ${i / batchSize + 1}`);
        } else {
            console.error(`Status ${res.status} for batch ${i / batchSize + 1}: ${res.data.substring(0, 100)}`);
        }
    }
    console.log('--- FINISHED ---');
    await prisma.$disconnect();
}

fixResolutions();
