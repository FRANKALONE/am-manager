
const https = require('https');
const fs = require('fs');
const path = require('path');

// Basic .env loader
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const jiraUrl = env.JIRA_URL?.trim();
const jiraEmail = env.JIRA_USER_EMAIL?.trim();
const jiraToken = env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function checkJiraIssue(key) {
    return new Promise((resolve) => {
        const req = https.request(`${jiraUrl}/rest/api/3/issue/${key}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

async function main() {
    const issueKeys = ['ENP-575', 'ENP-546', 'ALT-441'];
    for (const issueKey of issueKeys) {
        const issue = await checkJiraIssue(issueKey);
        if (issue) {
            console.log(`--- ${issue.key} ---`);
            console.log(`Status: ${issue.fields?.status?.name}`);
            console.log(`Resolution: ${JSON.stringify(issue.fields?.resolution)}`);

            const customFields = Object.keys(issue.fields).filter(k => k.startsWith('customfield_'));
            for (const cf of customFields) {
                const val = issue.fields[cf];
                if (val && typeof val === 'object' && (val.value === 'Aprobada' || val.name === 'Aprobada')) {
                    console.log(`Potential Resolution Field Found: ${cf} = ${JSON.stringify(val)}`);
                }
            }
        } else {
            console.log(`Issue ${issueKey} not found`);
        }
    }
}

main();
