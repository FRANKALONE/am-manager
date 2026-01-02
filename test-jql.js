const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

async function testJql() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const wpId = 'AMA00263MANT0001.1.1';

    // Test 1: Project-wide search (current behavior)
    const jql1 = `project = OBS AND (issuetype = Evolutivo OR issuetype = "Hitos Evolutivos")`;

    // Test 2: Account-filtered search (proposed fix)
    const jql2 = `project = OBS AND account = "${wpId}" AND (issuetype = Evolutivo OR issuetype = "Hitos Evolutivos")`;

    async function runSearch(jql) {
        const bodyData = JSON.stringify({
            jql,
            maxResults: 100,
            fields: ['key', 'timeoriginalestimate', 'customfield_10121']
        });

        return new Promise((resolve) => {
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
    }

    console.log(`Running JQL 1: ${jql1}`);
    const res1 = await runSearch(jql1);
    console.log(`JQL 1 found ${res1.total || 0} issues.`);
    if (res1.issues) {
        const sum = res1.issues.reduce((s, i) => s + (i.fields.timeoriginalestimate || 0), 0) / 3600;
        console.log(`JQL 1 Total Estimate: ${sum}h`);
    }

    console.log(`\nRunning JQL 2: ${jql2}`);
    const res2 = await runSearch(jql2);
    console.log(`JQL 2 found ${res2.total || 0} issues.`);
    if (res2.issues) {
        const sum = res2.issues.reduce((s, i) => s + (i.fields.timeoriginalestimate || 0), 0) / 3600;
        console.log(`JQL 2 Total Estimate: ${sum}h`);
    }
}

testJql().catch(console.error);
