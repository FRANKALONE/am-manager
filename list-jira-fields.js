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

async function listAllFields() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials');
        return;
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const url = `${jiraUrl}/rest/api/3/field`;

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
                console.error(`Error ${res.statusCode}: ${data}`);
                return;
            }

            try {
                const fields = JSON.parse(data);
                console.log(`Total fields: ${fields.length}`);

                // Search for field 10121
                const field10121 = fields.find(f => f.id === 'customfield_10121');
                console.log('\n--- FIELD 10121 ---');
                if (field10121) {
                    console.log(`ID: ${field10121.id} | Name: ${field10121.name} | Custom: ${field10121.custom} | Type: ${field10121.schema?.custom || field10121.schema?.type}`);
                } else {
                    console.log('Field 10121 NOT FOUND');
                }

                // Show some other potential fields
                console.log('\n--- ALL FIELDS (FIRST 20) ---');
                fields.slice(0, 20).forEach(f => {
                    console.log(`ID: ${f.id} | Name: ${f.name}`);
                });

            } catch (e) {
                console.error('Parse error:', e);
            }
        });
    }).on('error', (err) => {
        console.error('Request error:', err);
    });
}

listAllFields();
