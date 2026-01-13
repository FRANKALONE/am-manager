require('dotenv').config();
const https = require('https');
const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();
const tempoToken = process.env.TEMPO_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function fetchJiraIssues(keys) {
    const jql = `key IN (${keys.join(',')})`;
    const bodyData = JSON.stringify({
        jql,
        fields: ['key', 'issuetype', 'customfield_10121', 'status', 'summary', 'created']
    });

    return new Promise((resolve, reject) => {
        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(bodyData);
        req.end();
    });
}

async function fetchTempoWorklogs(issueId) {
    return new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/worklogs/issue/${issueId}`;
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tempoToken}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        const keys = ['FUE-724', 'FUE-728', 'FUE-729'];
        console.log(`Fetching Jira details for ${keys.join(', ')}...`);
        const jiraRes = await fetchJiraIssues(keys);

        if (!jiraRes.issues) {
            console.log('No issues found or error:', jiraRes);
            return;
        }

        for (const issue of jiraRes.issues) {
            console.log(`\n--- Issue: ${issue.key} (ID: ${issue.id}) ---`);
            console.log(`Summary: ${issue.fields.summary}`);
            console.log(`Type: ${issue.fields.issuetype.name}`);
            console.log(`Status: ${issue.fields.status.name}`);

            console.log(`Fetching ALL Tempo worklogs for ${issue.id}...`);
            const tempoRes = await fetchTempoWorklogs(issue.id);
            if (tempoRes.results) {
                console.log(`Found ${tempoRes.results.length} worklogs in total.`);
                tempoRes.results.forEach(log => {
                    const account = log.account ? `${log.account.key || log.account.id} (${log.account.name || ''})` : 'No Account';
                    console.log(`- ${log.startDate}: ${log.timeSpentSeconds / 3600}h by ${log.author?.displayName || 'Unknown'} | Account: ${account} | ID: ${log.tempoWorklogId || log.id}`);
                });
            } else {
                console.log('No worklogs found or error:', tempoRes);
            }
        }
    } catch (e) {
        console.error('Error in main:', e);
    }
}

main();
