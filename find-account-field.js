const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient();

async function findAccountField() {
    console.log('=== Finding Account Custom Field ===\n');

    // Get JIRA credentials from env
    const jiraUrl = 'https://everisgroup.atlassian.net';
    const jiraEmail = process.env.JIRA_USER_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;

    console.log('Testing with ticket: IMP-1259');
    console.log('Expected Account value: TEC00188MANTALL1.1.2\n');

    const url = new URL(`${jiraUrl}/rest/api/3/issue/IMP-1259`);

    const result = await new Promise((resolve) => {
        const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
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
                    resolve({ error: 'Parse error', raw: data });
                }
            });
        });
        req.on('error', (err) => resolve({ error: err.message }));
        req.end();
    });

    if (result.error) {
        console.error('Error:', result.error);
        if (result.raw) console.log('Response:', result.raw.substring(0, 500));
        return;
    }

    if (result.fields) {
        console.log('Searching for Account field...\n');

        // Search through all custom fields
        for (const [key, value] of Object.entries(result.fields)) {
            if (key.startsWith('customfield_')) {
                // Check if value matches Account pattern
                if (typeof value === 'string' && (value.includes('TEC00188') || value.includes('AMA00188'))) {
                    console.log(`✅ FOUND Account field!`);
                    console.log(`Field ID: ${key}`);
                    console.log(`Value: ${value}\n`);
                    return key;
                }
                // Check if it's an object with key property
                if (value && typeof value === 'object') {
                    const jsonStr = JSON.stringify(value);
                    if (jsonStr.includes('TEC00188') || jsonStr.includes('AMA00188')) {
                        console.log(`✅ FOUND Account field (object)!`);
                        console.log(`Field ID: ${key}`);
                        console.log(`Value: ${JSON.stringify(value, null, 2)}\n`);
                        return key;
                    }
                }
            }
        }

        console.log('❌ Account field not found with expected value');
        console.log('\nShowing first 10 custom fields:');
        Object.keys(result.fields)
            .filter(k => k.startsWith('customfield_'))
            .slice(0, 10)
            .forEach(k => {
                const val = result.fields[k];
                if (val) {
                    const display = typeof val === 'object' ? JSON.stringify(val).substring(0, 80) : val;
                    console.log(`  ${k}: ${display}`);
                }
            });
    }

    await prisma.$disconnect();
}

findAccountField().catch(console.error);
