const https = require('https');

const jiraUrl = process.env.JIRA_URL || 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

// Search for any issue in EUR project with key containing 1615
const jql = 'project = EUR AND key ~ "1615"';

const bodyData = JSON.stringify({
    jql,
    maxResults: 5,
    fields: ['*all']
});

console.log('\n🔍 Searching for EUR-1615 or similar\n');

const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const result = JSON.parse(data);
                console.log(`✅ Found ${result.issues.length} issues\n`);

                result.issues.forEach((issue) => {
                    console.log(`Issue: ${issue.key} - ${issue.fields.summary}`);
                    console.log(`Created: ${issue.fields.created}`);
                    console.log(`Issue Type: ${issue.fields.issuetype?.name}`);

                    // Check for billing mode field
                    console.log('\n📋 Checking custom fields for Modo de Facturación:');
                    Object.keys(issue.fields).forEach(key => {
                        if (key.startsWith('customfield_')) {
                            const value = issue.fields[key];
                            if (value && typeof value === 'string' && value.includes('Bolsa')) {
                                console.log(`  ${key}: ${value}`);
                            } else if (value && typeof value === 'object' && value.value) {
                                console.log(`  ${key}: ${JSON.stringify(value)}`);
                            }
                        }
                    });

                    console.log('\n⏱️  Time Tracking:');
                    console.log(`  Original Estimate: ${issue.fields.timeoriginalestimate || 'NOT SET'} seconds`);
                    if (issue.fields.timeoriginalestimate) {
                        const hours = issue.fields.timeoriginalestimate / 3600;
                        console.log(`  = ${hours} hours`);
                    }
                    console.log('');
                });

                if (result.issues.length > 0) {
                    console.log('\n📄 Full first issue:');
                    console.log(JSON.stringify(result.issues[0], null, 2));
                }
            } catch (e) {
                console.error('❌ Failed to parse response:', e.message);
            }
        } else {
            console.error('❌ Error:', res.statusCode);
            console.log(data);
        }
    });
});

req.on('error', err => console.error('❌ Request error:', err.message));
req.write(bodyData);
req.end();
