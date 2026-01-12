const https = require('https');
require('dotenv').config();

async function testJiraPortal(projectKey) {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials');
        return;
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/portals/project/${projectKey}`;

    console.log(`Fetching: ${url}`);

    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    resolve(json);
                } catch (e) {
                    console.log('Raw data:', data);
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
    });
}

testJiraPortal('APR');
