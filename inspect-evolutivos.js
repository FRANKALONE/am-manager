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

async function inspectEvolutivos() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    // JQL to find Evolutivos
    const jql = 'issuetype = Evolutivo ORDER BY created DESC';
    console.log(`Searching for Evolutivos with JQL: ${jql}`);

    const bodyData = JSON.stringify({
        jql,
        maxResults: 5,
        fields: ['key', 'summary', 'issuetype', 'status', 'customfield_10121', 'subtasks', 'assignee', 'duedate']
    });

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, options, (res) => {
        let data = '';
        res.on('data', (d) => data += d);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`Error ${res.statusCode}: ${data}`);
                return;
            }
            try {
                const searchRes = JSON.parse(data);
                console.log(`Found ${searchRes.total} total Evolutivos.`);

                searchRes.issues.forEach(issue => {
                    console.log(`\n--- Ticket: ${issue.key} ---`);
                    console.log(`Summary: ${issue.fields.summary}`);
                    console.log(`Status: ${issue.fields.status.name}`);
                    console.log(`Billing Mode: ${JSON.stringify(issue.fields.customfield_10121)}`);
                    console.log(`Assignee (Gestor?): ${issue.fields.assignee?.displayName || 'None'}`);
                    console.log(`Due Date: ${issue.fields.duedate || 'None'}`);

                    if (issue.fields.subtasks && issue.fields.subtasks.length > 0) {
                        console.log(`Subtasks (${issue.fields.subtasks.length}):`);
                        issue.fields.subtasks.forEach(st => {
                            console.log(`  - ${st.key}: ${st.fields.summary} (${st.fields.status.name}) [Type: ${st.fields.issuetype.name}]`);
                        });
                    } else {
                        console.log('No subtasks found.');
                    }
                });
            } catch (e) {
                console.error(e);
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(bodyData);
    req.end();
}

inspectEvolutivos();
