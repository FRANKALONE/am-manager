const https = require('https');
require('dotenv').config();

async function testJiraPortalEndpoint(serviceDeskId) {
    const jiraUrl = process.env.JIRA_URL?.trim().replace(/\/+$/, '');
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/servicedesk/${serviceDeskId}/portal`;

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
                    console.log('Error parsing JSON or empty response');
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
    });
}

testJiraPortalEndpoint('22'); // APR
