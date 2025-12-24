const https = require('https');

const jiraUrl = process.env.JIRA_URL || 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

console.log('\n🔍 Fetching EUR-1615 to see field structure\n');

const req = https.request(`${jiraUrl}/rest/api/3/issue/EUR-1615`, {
    method: 'GET',
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
                const issue = JSON.parse(data);
                console.log(`✅ Issue: ${issue.key} - ${issue.fields.summary}\n`);
                console.log(`Created: ${issue.fields.created}`);
                console.log(`Issue Type: ${issue.fields.issuetype?.name}`);
                console.log(`Status: ${issue.fields.status?.name}`);

                // Check all custom fields
                console.log('\n📋 Custom Fields:');
                Object.keys(issue.fields).forEach(key => {
                    if (key.startsWith('customfield_')) {
                        const value = issue.fields[key];
                        if (value !== null && value !== undefined) {
                            console.log(`${key}: ${JSON.stringify(value)}`);
                        }
                    }
                });

                console.log('\n⏱️  Time Tracking:');
                console.log(`Original Estimate: ${issue.fields.timeoriginalestimate || 'NOT SET'} seconds`);
                if (issue.fields.timeoriginalestimate) {
                    const hours = issue.fields.timeoriginalestimate / 3600;
                    console.log(`= ${hours} hours`);
                }
                console.log(`Remaining Estimate: ${issue.fields.timeestimate || 'NOT SET'}`);
                console.log(`Time Spent: ${issue.fields.timespent || 'NOT SET'}`);

                console.log('\n📄 Full Issue:');
                console.log(JSON.stringify(issue, null, 2));
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
req.end();
