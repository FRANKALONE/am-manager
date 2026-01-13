
const https = require('https');
require('dotenv').config();

const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

const issueKey = 'FAI-548'; // A sample issue key

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(`${jiraUrl}/rest/api/3/issue/${issueKey}`, options, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        const issue = JSON.parse(data);
        console.log('Issue Summary:', issue.fields.summary);
        console.log('Billing Mode Raw:', JSON.stringify(issue.fields.customfield_10121, null, 2));
        console.log('Components Raw:', JSON.stringify(issue.fields.components, null, 2));
    });
});

req.on('error', (err) => console.error(err));
req.end();
