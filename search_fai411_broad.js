// Script to search for FAI-411 using broader JQL
const https = require('https');

async function searchFai411Broad() {
    console.log('=== Searching for FAI-411 ===\n');

    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    // Try with project FAI
    const jql = 'project = FAI AND key = FAI-411';
    const url = `https://altim.atlassian.net/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=1&fields=summary,issuetype,status,customfield_10121,created,timeoriginalestimate`;

    const jiraRes = await new Promise((resolve) => {
        const req = https.request(url, {
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
                        console.log(`Error ${res.statusCode}: ${data}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                    resolve(null);
                }
            });
        });
        req.on('error', (err) => {
            console.error('Request error:', err);
            resolve(null);
        });
        req.end();
    });

    if (!jiraRes || !jiraRes.issues || jiraRes.issues.length === 0) {
        console.log('FAI-411 not found in project FAI');

        // Try searching across all projects
        console.log('\nTrying to search across all projects...');
        const broadJql = 'key = FAI-411';
        const broadUrl = `https://altim.atlassian.net/rest/api/2/search?jql=${encodeURIComponent(broadJql)}&maxResults=1&fields=summary,issuetype,status,customfield_10121,project`;

        const broadRes = await new Promise((resolve) => {
            const req = https.request(broadUrl, {
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
                            console.log(`Error ${res.statusCode}: ${data}`);
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

        if (!broadRes || !broadRes.issues || broadRes.issues.length === 0) {
            console.log('FAI-411 not found in any project');
            return;
        }

        const issue = broadRes.issues[0];
        console.log(`\nFound in project: ${issue.fields.project.key}`);
        console.log(`Key: ${issue.key}`);
        console.log(`Summary: ${issue.fields.summary}`);
        return;
    }

    const issue = jiraRes.issues[0];
    console.log(`Found: ${issue.key}`);
    console.log(`ID: ${issue.id}`);
    console.log(`Summary: ${issue.fields.summary}`);
    console.log(`Type: ${issue.fields.issuetype.name}`);
    console.log(`Status: ${issue.fields.status.name}`);

    const billingMode = issue.fields.customfield_10121;
    console.log(`Billing Mode (raw): ${JSON.stringify(billingMode)}`);
    console.log(`Billing Mode: ${billingMode?.value || 'NOT SET'}`);
}

searchFai411Broad().catch(console.error);
