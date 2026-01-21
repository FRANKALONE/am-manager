const https = require('https');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const auth = Buffer.from(`${env.JIRA_USER_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');
const options = {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
    }
};

https.get(`${env.JIRA_URL}/rest/api/3/project`, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const projects = JSON.parse(data);
            const summary = projects.map(p => ({
                key: p.key,
                name: p.name,
                type: p.projectTypeKey,
                category: p.projectCategory ? p.projectCategory.name : 'N/A'
            }));
            console.log(JSON.stringify(summary, null, 2));
        } catch (e) {
            console.error(e);
        }
    });
});
