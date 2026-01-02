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

                const slaFields = fields.filter(f => f.name.toLowerCase().includes('sla') || f.custom && f.schema && f.schema.custom && f.schema.custom.includes('sla'));

                console.log('\n--- FIELDS RELATED TO SLA ---');
                slaFields.forEach(f => {
                    console.log(`ID: ${f.id} | Name: ${f.name} | Custom: ${f.custom} | Type: ${f.schema?.custom || f.schema?.type}`);
                });

                // Also search for "Time to" which is common in SLAs
                const timeToFields = fields.filter(f => f.name.toLowerCase().includes('time to'));
                console.log('\n--- FIELDS CONTAINING "Time to" ---');
                timeToFields.forEach(f => {
                    console.log(`ID: ${f.id} | Name: ${f.name} | Custom: ${f.custom} | Type: ${f.schema?.custom || f.schema?.type}`);
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
