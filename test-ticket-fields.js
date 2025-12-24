const https = require('https');
const fs = require('fs');

// Read .env file manually
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

async function testTicket() {
    console.log('=== Testing Ticket IMP-1259 ===\n');

    const jiraUrl = 'https://everisgroup.atlassian.net';
    const jiraEmail = envVars.JIRA_USER_EMAIL;
    const jiraToken = envVars.JIRA_API_TOKEN;

    if (!jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials in .env');
        console.log('Found vars:', Object.keys(envVars));
        return;
    }

    console.log(`Fetching: ${jiraUrl}/rest/api/3/issue/IMP-1259\n`);

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
                    console.error('Parse error:', e.message);
                    console.log('Raw response:', data.substring(0, 500));
                    resolve({ error: 'Parse error' });
                }
            });
        });
        req.on('error', (err) => {
            console.error('Request error:', err.message);
            resolve({ error: err.message });
        });
        req.end();
    });

    if (result.error) {
        console.error('Failed to fetch ticket');
        return;
    }

    if (!result.fields) {
        console.error('No fields in response');
        console.log('Response:', JSON.stringify(result, null, 2).substring(0, 500));
        return;
    }

    console.log('✅ Ticket fetched successfully\n');
    console.log('Looking for field with value: TEC00188MANTALL1.1.2\n');

    // Check all fields
    let found = false;
    for (const [key, value] of Object.entries(result.fields)) {
        // String value
        if (typeof value === 'string' && value.includes('TEC00188')) {
            console.log(`✅ FOUND in field: ${key}`);
            console.log(`   Value: ${value}\n`);
            found = true;
        }
        // Object value
        else if (value && typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            if (jsonStr.includes('TEC00188')) {
                console.log(`✅ FOUND in field: ${key}`);
                console.log(`   Value: ${JSON.stringify(value, null, 2)}\n`);
                found = true;
            }
        }
    }

    if (!found) {
        console.log('❌ Field not found. Showing all custom fields:\n');
        Object.entries(result.fields)
            .filter(([key]) => key.startsWith('customfield_'))
            .forEach(([key, value]) => {
                if (value) {
                    const display = typeof value === 'object'
                        ? JSON.stringify(value).substring(0, 100)
                        : value;
                    console.log(`${key}: ${display}`);
                }
            });
    }
}

testTicket().catch(console.error);
