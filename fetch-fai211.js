const https = require('https');

const jiraUrl = 'https://altim.atlassian.net';
const jiraEmail = process.env.JIRA_USER_EMAIL;
const jiraToken = process.env.JIRA_API_TOKEN;
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

const options = {
    hostname: 'altim.atlassian.net',
    path: '/rest/api/3/issue/FAI-211?fields=issuetype,customfield_10121,summary,status',
    method: 'GET',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const issue = JSON.parse(data);
            console.log('Issue Type:', issue.fields.issuetype?.name);
            console.log('Billing Mode:', issue.fields.customfield_10121?.value || issue.fields.customfield_10121);
            console.log('Summary:', issue.fields.summary);
            console.log('Status:', issue.fields.status?.name);
        } catch (e) {
            console.error('Parse error:', e);
            console.log('Raw:', data);
        }
    });
});

req.on('error', (e) => console.error('Error:', e));
req.end();
