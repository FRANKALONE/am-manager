const https = require('https');
const fs = require('fs');

async function auditObs() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const jql = 'project = OBS AND (issuetype = Evolutivo OR issuetype = "Hitos Evolutivos")';
    const bodyData = JSON.stringify({
        jql,
        maxResults: 100,
        fields: ['key', 'issuetype', 'customfield_10121', 'account', 'parent']
    });

    const resRaw = await new Promise((resolve) => {
        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.write(bodyData);
        req.end();
    });

    if (!resRaw.issues) {
        console.log('No issues found or error:', resRaw);
        return;
    }

    const audit = resRaw.issues.map(i => ({
        key: i.key,
        type: i.fields.issuetype.name,
        billing: i.fields.customfield_10121?.value || 'N/A',
        account: i.fields.account || 'EMPTY',
        parent: i.fields.parent?.key || null
    }));

    console.log(JSON.stringify(audit, null, 2));
}

auditObs().catch(console.error);
