const https = require('https');
require('dotenv').config();

const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();

if (!jiraUrl || !jiraEmail || !jiraToken) {
    console.error('❌ JIRA credentials missing in environment');
    process.exit(1);
}

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function listAllServiceDesks() {
    console.log(`🔍 Fetching Service Desks from ${jiraUrl}...`);
    // Remove trailing slash if present for cleaner URL construction
    const baseJiraUrl = jiraUrl.replace(/\/+$/, '');
    const url = `${baseJiraUrl}/rest/servicedeskapi/servicedesk`;

    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`❌ Error: ${res.statusCode}`);
                    console.log('Raw data:', data.substring(0, 500));
                    return resolve(null);
                }
                try {
                    const json = JSON.parse(data);
                    const values = json.values || [];
                    console.log(`✅ Found ${values.length} Service Desks:`);
                    values.forEach(sd => {
                        console.log(`- Project: ${sd.projectName} | Key: ${sd.projectKey} | ID: ${sd.id}`);
                    });

                    const keys = values.map(sd => sd.projectKey);
                    console.log('\nAvailable Keys:', keys.join(', '));
                    resolve(keys);
                } catch (e) {
                    console.error('❌ Failed to parse JSON:', e);
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
    });
}

listAllServiceDesks().catch(console.error);
