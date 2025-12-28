const https = require('https');
const fs = require('fs');

// Simple .env parser
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

async function testJira() {
    const jiraUrl = env.JIRA_URL;
    const jiraEmail = env.JIRA_USER_EMAIL;
    const jiraToken = env.JIRA_API_TOKEN;
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const jql = 'issueKey = "FAI-411"';
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
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, error: e.message, data: data });
                }
            });
        });
        req.write(bodyData);
        req.end();
    });

    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
}

testJira();
