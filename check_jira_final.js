const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });
    return env;
}

async function main() {
    const env = getEnv();
    const jiraUrl = env.JIRA_URL;
    const auth = Buffer.from(`${env.JIRA_USER_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');

    const jql = 'issueKey = "FAI-411"';
    const bodyData = JSON.stringify({
        jql,
        maxResults: 1,
        fields: ['key', 'summary', 'issuetype', 'customfield_10121']
    });

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, options, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
            console.log(JSON.stringify(JSON.parse(data), null, 2));
        });
    });

    req.write(bodyData);
    req.end();
}

main().catch(console.error);
