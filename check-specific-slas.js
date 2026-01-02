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

async function checkSpecificSLAs() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        console.error('Missing JIRA credentials');
        return;
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    // IDs found in list-jira-fields.js
    const slaFields = [
        'customfield_10064', // Tiempo hasta resolución
        'customfield_10065', // Tiempo hasta primera respuesta
        'customfield_10047', // Time to resolution
        'customfield_10048', // Time to first response
        'customfield_10386'  // Presentación Petición de evolutivo
    ];

    const issueKey = 'FAI-411';
    console.log(`Checking specific SLAs for ${issueKey}...`);

    const url = `${jiraUrl}/rest/api/3/issue/${issueKey}?fields=${slaFields.join(',')}`;

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
                const issue = JSON.parse(data);
                console.log('\n--- SLA VALUES ---');
                for (const fieldId of slaFields) {
                    const value = issue.fields[fieldId];
                    console.log(`\nField: ${fieldId}`);
                    if (value) {
                        console.log(`  Value: ${JSON.stringify(value).substring(0, 500)}`);
                    } else {
                        console.log(`  Value: NULL`);
                    }
                }
            } catch (e) {
                console.error('Parse error:', e);
            }
        });
    }).on('error', (err) => {
        console.error('Request error:', err);
    });
}

checkSpecificSLAs();
