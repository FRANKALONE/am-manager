const https = require('https');
const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

const issueKey = 'FAI-211';

const options = {
    hostname: new URL(jiraUrl).hostname,
    path: `/rest/api/3/issue/${issueKey}?fields=issuetype,customfield_10121,summary,status`,
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
            console.log('Jira Issue:', JSON.stringify(issue, null, 2));
        } catch (e) {
            console.error('Failed to parse Jira response', e);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error', e);
});

req.end();
