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

    if (!JIRA_TOKEN || !JIRA_USER) {
        console.error('Jira credentials not found');
        process.exit(1);
    }

    const auth = Buffer.from(`${JIRA_USER}:${JIRA_TOKEN}`).toString('base64');
    const issueId = '96604'; // From APK logs

    console.log(`Fetching Jira issue ${issueId}...`);

    const res = await new Promise((resolve, reject) => {
        const url = `https://altim.atlassian.net/rest/api/2/issue/${issueId}`;
        const req = https.request(url, {
            method: 'GET',
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
        req.end();
    });

    console.log('Status:', res.status);
    if (res.data && res.data.fields) {
        console.log('Issue Type:', res.data.fields.issuetype.name);
        console.log('Project:', res.data.fields.project.key);
    }
}

main().catch(console.error);
