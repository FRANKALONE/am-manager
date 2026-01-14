const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid dependency issues
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const jiraToken = env.JIRA_API_TOKEN;
const jiraEmail = env.JIRA_USER_EMAIL;
const jiraUrl = env.JIRA_URL;

if (!jiraToken || !jiraEmail || !jiraUrl) {
    console.error('Missing JIRA_API_TOKEN, JIRA_USER_EMAIL or JIRA_URL in .env');
    process.exit(1);
}

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
    }
};

const url = `${jiraUrl}/rest/api/3/field`;

console.log('Searching for "Responsable Técnico" fields...');

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const fields = JSON.parse(data);
            const found = fields.filter(f => f.name && f.name.includes('Responsable'));
            console.log(JSON.stringify(found, null, 2));
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log('Raw data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error with the request:', err.message);
});
