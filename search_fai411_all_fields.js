// Script to search FAI-411 with JQL without specifying fields
const https = require('https');

async function searchFai411DefaultFields() {
    console.log('=== Searching FAI-402 with JQL (default fields) ===\n');

    const jiraAuth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    const bodyData = JSON.stringify({
        jql: 'key = FAI-402',
        maxResults: 1
        // No fields specified = get all default fields
    });

    const jiraRes = await new Promise((resolve) => {
        const req = https.request('https://altim.atlassian.net/rest/api/3/search/jql', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${jiraAuth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData)
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
        req.write(bodyData);
        req.end();
    });

    if (!jiraRes || !jiraRes.issues || jiraRes.issues.length === 0) {
        console.log('FAI-402 not found');
        return;
    }

    const issue = jiraRes.issues[0];
    console.log(`Ticket: ${issue.key}`);
    console.log(`Summary: ${issue.fields.summary || 'N/A'}`);
    console.log(`Type: ${issue.fields.issuetype?.name || 'N/A'}`);
    console.log(`\nSearching for Account ID patterns...\n`);

    // Search for the values in all fields
    const searchPatterns = ['AMA00811EVOL', 'AMA00811', '.1.23', 'account'];
    const foundFields = [];

    for (const [fieldKey, fieldValue] of Object.entries(issue.fields)) {
        const valueStr = JSON.stringify(fieldValue);

        for (const pattern of searchPatterns) {
            if (valueStr.includes(pattern)) {
                foundFields.push({
                    field: fieldKey,
                    pattern,
                    value: valueStr.substring(0, 300)
                });
                break;
            }
        }
    }

    if (foundFields.length > 0) {
        console.log('✓ Found matching fields:');
        foundFields.forEach(f => {
            console.log(`\n  Field: ${f.field}`);
            console.log(`  Pattern: "${f.pattern}"`);
            console.log(`  Value: ${f.value}${f.value.length >= 300 ? '...' : ''}`);
        });
    } else {
        console.log('✗ No matching fields found');
    }

    console.log('\n\n=== All available fields ===');
    console.log(Object.keys(issue.fields).sort().join(', '));
}

searchFai411DefaultFields().catch(console.error);
