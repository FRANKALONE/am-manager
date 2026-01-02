const https = require('https');
const fs = require('fs');
const path = require('path');

// Manual env parsing
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

loadEnv();

async function findTicketsWithSLAs() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials');
        return;
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const jql = 'created > -30d order by created desc';
    const bodyData = JSON.stringify({
        jql,
        maxResults: 10,
        fields: ['*all'] // Ask for everything to find SLAs
    });

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
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
                const result = JSON.parse(data);

                result.issues.forEach(issue => {
                    const fields = issue.fields;
                    console.log(`\nTicket: ${issue.key} (${fields.issuetype.name})`);

                    for (const [key, value] of Object.entries(fields)) {
                        if (value && typeof value === 'object' && (value.ongoingCycle !== undefined || value.completedCycles !== undefined)) {
                            console.log(`  SLA Field: ${key} (${value.name || 'No Name'})`);
                            if (value.ongoingCycle) {
                                console.log(`    Remaining: ${value.ongoingCycle.remainingTime?.friendly || 'N/A'}`);
                                console.log(`    Breached: ${value.ongoingCycle.breached}`);
                            }
                            if (value.completedCycles && value.completedCycles.length > 0) {
                                console.log(`    Completed: ${value.completedCycles.length}`);
                                console.log(`    Last Breach: ${value.completedCycles[value.completedCycles.length - 1].breached}`);
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Parse error:', e);
            }
        });
    });

    req.write(bodyData);
    req.end();
}

findTicketsWithSLAs();
