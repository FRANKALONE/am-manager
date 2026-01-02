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

async function inspectSLAFields() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials');
        return;
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    // Test with multiple issues to see different SLAs
    const issueKeys = ['FAI-411', 'FAI-402', 'FAI-320'];

    for (const issueKey of issueKeys) {
        console.log(`\n\n=========================================`);
        console.log(`Inspecting issue: ${issueKey}`);
        console.log(`=========================================`);

        const url = `${jiraUrl}/rest/api/3/issue/${issueKey}`;

        await new Promise((resolve) => {
            https.get(url, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.error(`Error ${res.statusCode} for ${issueKey}: ${data.substring(0, 100)}`);
                        resolve();
                        return;
                    }

                    try {
                        const issue = JSON.parse(data);

                        for (const [key, value] of Object.entries(issue.fields)) {
                            if (!value) continue;
                            const valStr = JSON.stringify(value);

                            // Check for SLA structure
                            const hasSLAStructure = typeof value === 'object' &&
                                (value.ongoingCycle !== undefined || value.completedCycles !== undefined);

                            if (hasSLAStructure || key.toLowerCase().includes('sla') || valStr.includes('remainingTime')) {
                                console.log(`\n[FOUND] Field: ${key}`);
                                // We can't get the name from rest/api/3/issue, but if it has a 'name' property inside the value...
                                if (value.name) console.log(`  Name: ${value.name}`);

                                if (value.ongoingCycle) {
                                    console.log(`  Ongoing Cycle:`);
                                    console.log(`    StartTime: ${value.ongoingCycle.startTime?.friendly || value.ongoingCycle.startTime}`);
                                    console.log(`    Remaining: ${value.ongoingCycle.remainingTime?.friendly || JSON.stringify(value.ongoingCycle.remainingTime)}`);
                                    console.log(`    Breached: ${value.ongoingCycle.breached}`);
                                }

                                if (value.completedCycles && value.completedCycles.length > 0) {
                                    console.log(`  Completed Cycles: ${value.completedCycles.length}`);
                                    const last = value.completedCycles[value.completedCycles.length - 1];
                                    console.log(`    Last Cycle Breached: ${last.breached}`);
                                    if (last.stopTime) console.log(`    Stopped At: ${last.stopTime.friendly || last.stopTime}`);
                                }

                                if (!value.ongoingCycle && (!value.completedCycles || value.completedCycles.length === 0)) {
                                    console.log(`  Value: ${valStr.substring(0, 200)}`);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Parse error:', e);
                    }
                    resolve();
                });
            }).on('error', (err) => {
                console.error('Request error:', err);
                resolve();
            });
        });
    }
}

inspectSLAFields();
