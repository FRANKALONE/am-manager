// Simple test using existing sync infrastructure
const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function testAccountField() {
    console.log('=== Finding Account Field ===\n');

    // Get credentials from environment (should be loaded by Next.js)
    const jiraUrl = process.env.JIRA_URL || 'https://everisgroup.atlassian.net';
    const jiraEmail = process.env.JIRA_USER_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;

    console.log('JIRA URL:', jiraUrl);
    console.log('Email set:', !!jiraEmail);
    console.log('Token set:', !!jiraToken);
    console.log();

    if (!jiraEmail || !jiraToken) {
        console.error('❌ Missing credentials');
        console.log('\nPlease run this from the Next.js context or set env vars');
        await prisma.$disconnect();
        return;
    }

    const ticketKey = 'IMP-1259';
    console.log(`Fetching ticket: ${ticketKey}`);
    console.log(`Expected Account value: TEC00188MANTALL1.1.2\n`);

    const url = new URL(`${jiraUrl}/rest/api/3/issue/${ticketKey}`);

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
                    resolve({ error: 'Parse error', raw: data.substring(0, 200) });
                }
            });
        });
        req.on('error', (err) => resolve({ error: err.message }));
        req.end();
    });

    if (result.error) {
        console.error('❌ Error:', result.error);
        if (result.raw) console.log('Response:', result.raw);
        await prisma.$disconnect();
        return;
    }

    if (!result.fields) {
        console.error('❌ No fields in response');
        await prisma.$disconnect();
        return;
    }

    console.log('✅ Ticket fetched\n');
    console.log('Searching for Account field...\n');

    // Search for the field
    let foundField = null;
    for (const [key, value] of Object.entries(result.fields)) {
        if (typeof value === 'string' && value.includes('TEC00188')) {
            foundField = { key, value, type: 'string' };
            break;
        }
        if (value && typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            if (jsonStr.includes('TEC00188')) {
                foundField = { key, value, type: 'object' };
                break;
            }
        }
    }

    if (foundField) {
        console.log('✅ FOUND Account field!');
        console.log(`Field ID: ${foundField.key}`);
        console.log(`Type: ${foundField.type}`);
        console.log(`Value:`, typeof foundField.value === 'object'
            ? JSON.stringify(foundField.value, null, 2)
            : foundField.value);
        console.log('\n📝 Use this in JQL: `${foundField.key} = "WP_ID"`');
    } else {
        console.log('❌ Account field not found');
        console.log('\nShowing first 15 custom fields:');
        Object.entries(result.fields)
            .filter(([k]) => k.startsWith('customfield_'))
            .slice(0, 15)
            .forEach(([k, v]) => {
                if (v) {
                    const display = typeof v === 'object' ? JSON.stringify(v).substring(0, 80) : v;
                    console.log(`  ${k}: ${display}`);
                }
            });
    }

    await prisma.$disconnect();
}

testAccountField().catch(console.error);
