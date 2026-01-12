const https = require('https');
require('dotenv').config();

async function listAllPortals() {
    const jiraUrl = process.env.JIRA_URL?.trim().replace(/\/+$/, '');
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/portal?limit=1000`;

    console.log(`Fetching: ${url}`);

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
                console.log(`Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    const values = json.values || [];
                    console.log(`✅ Found ${values.length} portals:`);
                    values.forEach(p => {
                        console.log(`- Portal ID: ${p.id} | Name: ${p.name}`);
                    });
                    resolve(values);
                } catch (e) {
                    console.error('❌ Failed to parse JSON:', e);
                    console.log('Raw data (first 500 chars):', data.substring(0, 500));
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
    });
}

listAllPortals().catch(console.error);
