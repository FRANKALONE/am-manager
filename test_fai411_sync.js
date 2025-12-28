// Script to test FAI-411 sync manually
const https = require('https');

async function testFai411Sync() {
    console.log('=== Testing FAI-411 Sync ===\n');

    // 1. Get issue details from Jira
    console.log('1. Fetching FAI-411 from Jira...');
    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const jiraRes = await new Promise((resolve) => {
        const req = https.request('https://altim.atlassian.net/rest/api/2/issue/FAI-411', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${jiraAuth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        console.log(`Error ${res.statusCode}`);
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });

    if (!jiraRes) {
        console.log('Failed to fetch from Jira');
        return;
    }

    console.log(`  Issue ID: ${jiraRes.id}`);
    console.log(`  Issue Key: ${jiraRes.key}`);
    console.log(`  Type: ${jiraRes.fields.issuetype.name}`);
    console.log(`  Billing Mode: ${jiraRes.fields.customfield_10121?.value || 'NOT SET'}`);

    // 2. Get worklogs from Tempo
    console.log('\n2. Fetching worklogs from Tempo...');
    const tempoRes = await new Promise((resolve) => {
        const req = https.request(`https://api.tempo.io/4/worklogs/issue/FAI-411`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.TEMPO_API_TOKEN}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        console.log(`Error ${res.statusCode}: ${data}`);
                        resolve({ results: [] });
                    }
                } catch (e) {
                    resolve({ results: [] });
                }
            });
        });
        req.on('error', () => resolve({ results: [] }));
        req.end();
    });

    console.log(`  Total worklogs: ${tempoRes.results?.length || 0}`);

    if (tempoRes.results && tempoRes.results.length > 0) {
        console.log('\n3. Worklog details:');
        tempoRes.results.forEach((w, idx) => {
            const hours = w.timeSpentSeconds / 3600;
            const date = new Date(w.startDate);
            console.log(`\n  Worklog ${idx + 1}:`);
            console.log(`    Date: ${date.toLocaleDateString('es-ES')}`);
            console.log(`    Hours: ${hours.toFixed(2)}h`);
            console.log(`    Account Key: ${w.account?.key || 'N/A'}`);
            console.log(`    Account ID: ${w.account?.id || 'N/A'}`);
            console.log(`    Issue ID: ${w.issue?.id || 'N/A'}`);
            console.log(`    Issue Key: ${w.issue?.key || 'N/A'}`);
        });

        // Check if issue IDs match
        console.log('\n4. Verification:');
        const worklogIssueId = tempoRes.results[0]?.issue?.id;
        console.log(`  Jira Issue ID: ${jiraRes.id}`);
        console.log(`  Tempo Worklog Issue ID: ${worklogIssueId}`);
        console.log(`  Match: ${jiraRes.id === worklogIssueId ? 'YES' : 'NO'}`);
    }
}

testFai411Sync().catch(console.error);
