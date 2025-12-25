const https = require('https');
const fs = require('fs');
const path = require('path');

function getEnv(key) {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return null;
        const envText = fs.readFileSync(envPath, 'utf8');
        const lines = envText.split('\n');
        for (const line of lines) {
            const [k, ...v] = line.split('=');
            if (k && k.trim() === key) {
                return v.join('=').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
            }
        }
    } catch (e) {
        console.error('Error reading .env:', e);
    }
    return null;
}

async function main() {
    const JIRA_TOKEN = getEnv('JIRA_API_TOKEN');
    const JIRA_USER = getEnv('JIRA_USER_EMAIL');

    if (!JIRA_TOKEN || !JIRA_USER) return;

    const auth = Buffer.from(`${JIRA_USER}:${JIRA_TOKEN}`).toString('base64');
    const ids = ['96604'];
    const jql = `id IN (${ids.join(',')})`;

    console.log(`Testing JQL: ${jql}...`);

    const res = await new Promise((resolve, reject) => {
        const url = `https://altim.atlassian.net/rest/api/3/search/jql`;
        const body = JSON.stringify({
            jql,
            maxResults: 10,
            fields: ['key', 'summary', 'issuetype']
        });
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });

    console.log('Status:', res.status);
    console.log('Issues found:', res.data.total);
    if (res.data.issues) {
        res.data.issues.forEach(i => console.log(`- ${i.key}: ${i.fields.issuetype.name}`));
    }
}

main().catch(console.error);
