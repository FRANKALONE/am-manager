const https = require('https');
require('dotenv').config({ path: '.env.local' });

async function testJira() {
    const jiraUrl = process.env.JIRA_URL.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL.trim();
    const jiraToken = process.env.JIRA_API_TOKEN.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const jql = 'issueKey = "FAI-411"'; // Test specifically for this key
    const bodyData = JSON.stringify({
        jql,
        fields: ['key', 'summary', 'created', 'timeoriginalestimate', 'customfield_10121', 'status']
    });

    console.log('JQL:', jql);

    const res = await new Promise((resolve) => {
        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.write(bodyData);
        req.end();
    });

    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
}

testJira();
