const https = require('https');

// Test fetching Evolutivos with "Bolsa de Horas" billing mode
const jiraUrl = process.env.JIRA_URL || 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

// Test with EUR project
const jql = 'project = EUR AND issuetype = Evolutivo AND "Modo de Facturación" = "Bolsa de Horas"';

const bodyData = JSON.stringify({
    jql,
    maxResults: 5,
    fields: ['key', 'summary', 'created', 'issuetype', 'customfield_10121', 'timeoriginalestimate']
});

console.log('\n🔍 Searching for Evolutivos with Bolsa de Horas billing mode in EUR project\n');
console.log('JQL:', jql, '\n');

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
        console.log(`Status Code: ${res.statusCode}\n`);

        if (res.statusCode === 200) {
            try {
                const result = JSON.parse(data);
                console.log(`✅ Found ${result.total} Evolutivos\n`);

                result.issues.forEach((issue, index) => {
                    console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
                    console.log(`   Created: ${issue.fields.created}`);
                    console.log(`   Issue Type: ${issue.fields.issuetype?.name}`);
                    console.log(`   Billing Mode: ${issue.fields.customfield_10121 || 'NOT SET'}`);
                    console.log(`   Original Estimate: ${issue.fields.timeoriginalestimate || 'NOT SET'} seconds`);
                    if (issue.fields.timeoriginalestimate) {
                        const hours = issue.fields.timeoriginalestimate / 3600;
                        console.log(`   Original Estimate: ${hours} hours`);
                    }
                    console.log('');
                });

                console.log('\n📋 Full response:');
                console.log(JSON.stringify(result, null, 2));
            } catch (e) {
                console.error('❌ Failed to parse response:', e.message);
                console.log('Raw data:', data);
            }
        } else {
            console.error('❌ Error response:');
            console.log(data);
        }
    });
});

req.on('error', err => {
    console.error('❌ Request error:', err.message);
});

req.write(bodyData);
req.end();
