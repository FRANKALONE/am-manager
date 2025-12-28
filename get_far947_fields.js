// Script to get all fields from FAI-402
const https = require('https');

async function getFai402Fields() {
    console.log('=== Getting FAI-402 fields from Jira API v3 ===\n');

    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const url = 'https://altim.atlassian.net/rest/api/3/issue/FAI-402';

    const jiraRes = await new Promise((resolve) => {
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${jiraAuth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        console.log(`Error ${res.statusCode}: ${data}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                    resolve(null);
                }
            });
        });
        req.on('error', (err) => {
            console.error('Request error:', err);
            resolve(null);
        });
        req.end();
    });

    if (!jiraRes) {
        console.log('Failed to fetch FAI-402');
        return;
    }

    console.log(`Ticket: ${jiraRes.key}`);
    console.log(`Summary: ${jiraRes.fields.summary}`);
    console.log(`\nSearching for values containing "AMA00811" or "EVOL"\n`);

    // Search for the values in all fields
    const searchPatterns = ['AMA00811', 'EVOL', 'account'];

    for (const [fieldKey, fieldValue] of Object.entries(jiraRes.fields)) {
        const valueStr = JSON.stringify(fieldValue).toLowerCase();

        for (const pattern of searchPatterns) {
            if (valueStr.includes(pattern.toLowerCase())) {
                console.log(`\n✓ Found "${pattern}" in field: ${fieldKey}`);
                const displayValue = JSON.stringify(fieldValue);
                console.log(`  Value: ${displayValue.substring(0, 300)}${displayValue.length > 300 ? '...' : ''}`);
            }
        }
    }

    console.log('\n\n=== All custom fields ===');
    Object.keys(jiraRes.fields)
        .filter(k => k.startsWith('customfield_'))
        .sort()
        .forEach(k => {
            const val = jiraRes.fields[k];
            if (val !== null && val !== undefined) {
                const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                if (valStr !== '[]' && valStr !== '{}') {
                    console.log(`\n${k}:`);
                    console.log(`  ${valStr.substring(0, 200)}${valStr.length > 200 ? '...' : ''}`);
                }
            }
        });
}

getFai402Fields().catch(console.error);
