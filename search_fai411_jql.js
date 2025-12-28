// Script to search FAI-411 using JQL API v3
const https = require('https');

async function searchFai411() {
    console.log('=== Searching FAI-411 using JQL (API v3) ===\n');

    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const url = 'https://altim.atlassian.net/rest/api/3/search?jql=key%3DFAI-411&maxResults=1&fields=summary,issuetype,status,customfield_10121,created,timeoriginalestimate';

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

    if (!jiraRes || !jiraRes.issues || jiraRes.issues.length === 0) {
        console.log('FAI-411 not found or no access');
        return;
    }

    const issue = jiraRes.issues[0];
    console.log(`Found: ${issue.key}`);
    console.log(`ID: ${issue.id}`);
    console.log(`Summary: ${issue.fields.summary}`);
    console.log(`Type: ${issue.fields.issuetype.name}`);
    console.log(`Status: ${issue.fields.status.name}`);

    const billingMode = issue.fields.customfield_10121;
    console.log(`Billing Mode: ${JSON.stringify(billingMode)}`);
    console.log(`Billing Mode Value: ${billingMode?.value || 'NOT SET'}`);
}

searchFai411().catch(console.error);
