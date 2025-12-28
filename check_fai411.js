// Script to check FAI-411 in Jira
const https = require('https');

async function checkFai411InJira() {
    console.log('=== Checking FAI-411 in Jira ===\n');

    // Fetch issue details from Jira
    const jiraRes = await new Promise((resolve, reject) => {
        const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
        const url = 'https://altim.atlassian.net/rest/api/2/issue/FAI-411';

        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
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

    if (!jiraRes) {
        console.log('FAI-411 not found or error fetching');
        return;
    }

    console.log(`Key: ${jiraRes.key}`);
    console.log(`Summary: ${jiraRes.fields.summary}`);
    console.log(`Type: ${jiraRes.fields.issuetype.name}`);
    console.log(`Status: ${jiraRes.fields.status.name}`);

    const billingMode = jiraRes.fields.customfield_10121;
    console.log(`Billing Mode (raw): ${JSON.stringify(billingMode)}`);
    console.log(`Billing Mode: ${billingMode?.value || billingMode || 'NOT SET'}`);

    const estimate = jiraRes.fields.timeoriginalestimate;
    console.log(`Original Estimate: ${estimate ? (estimate / 3600) + 'h' : 'NOT SET'}`);

    // Now check Tempo worklogs
    console.log('\n=== Checking Tempo worklogs ===\n');

    const tempoRes = await new Promise((resolve, reject) => {
        const url = `https://api.tempo.io/4/worklogs/issue/FAI-411`;
        const req = https.request(url, {
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
                        console.log(`Tempo Error ${res.statusCode}: ${data}`);
                        resolve({ results: [] });
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                    resolve({ results: [] });
                }
            });
        });
        req.on('error', (err) => {
            console.error('Request error:', err);
            resolve({ results: [] });
        });
        req.end();
    });

    console.log(`Total worklogs: ${tempoRes.results?.length || 0}`);

    if (tempoRes.results && tempoRes.results.length > 0) {
        console.log('\nWorklogs:');
        tempoRes.results.forEach(w => {
            const hours = w.timeSpentSeconds / 3600;
            const date = new Date(w.startDate);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            console.log(`  ${month}/${year}: ${hours.toFixed(2)}h (account: ${w.account?.key || 'N/A'})`);
        });
    }
}

checkFai411InJira().catch(console.error);
