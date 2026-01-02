const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) process.env[key.trim()] = valueParts.join('=').trim();
    });
}
loadEnv();

async function inspectIssue(issueKey) {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    console.log(`Inspecting issue: ${issueKey}`);
    const url = `${jiraUrl}/rest/api/3/issue/${issueKey}`;

    https.get(url, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    }, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`Error ${res.statusCode}: ${data}`);
                return;
            }
            try {
                const issue = JSON.parse(data);
                console.log('--- SLA CANDIDATE FIELDS ---');
                for (const [key, value] of Object.entries(issue.fields)) {
                    if (!value) continue;
                    const valStr = JSON.stringify(value);
                    if (key === 'customfield_10064' || key === 'customfield_10065') {
                        console.log(`\nField: ${key} (${value.name})`);
                        console.log(JSON.stringify(value, null, 2));
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
    });
}

inspectIssue('AIE-438');
