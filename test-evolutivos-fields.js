const https = require('https');

const jiraUrl = process.env.JIRA_URL || 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

// First, let's get ANY Evolutivo to see the structure
const jql = 'project IN (EUR, AIE) AND issuetype = Evolutivo ORDER BY created DESC';

const bodyData = JSON.stringify({
    jql,
    maxResults: 3,
    fields: ['key', 'summary', 'created', 'issuetype', 'customfield_10121', 'timeoriginalestimate', 'customfield_10120']
});

console.log('\n🔍 Fetching recent Evolutivos to see field structure\n');

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
                console.log(`✅ Found ${result.issues.length} Evolutivos\n`);

                result.issues.forEach((issue, index) => {
                    console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
                    console.log(`   Created: ${issue.fields.created}`);
                    console.log(`   Issue Type: ${issue.fields.issuetype?.name}`);
                    console.log(`   customfield_10121 (Billing Mode?): ${issue.fields.customfield_10121 || 'NOT SET'}`);
                    console.log(`   customfield_10120: ${issue.fields.customfield_10120 || 'NOT SET'}`);
                    console.log(`   Original Estimate: ${issue.fields.timeoriginalestimate || 'NOT SET'} seconds`);
                    if (issue.fields.timeoriginalestimate) {
                        const hours = issue.fields.timeoriginalestimate / 3600;
                        console.log(`   = ${hours} hours`);
                    }
                    console.log('');
                });

                // Show all fields of first issue
                if (result.issues.length > 0) {
                    console.log('\n📋 All fields of first issue:');
                    console.log(JSON.stringify(result.issues[0].fields, null, 2));
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
