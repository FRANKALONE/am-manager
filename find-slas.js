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

    // Search for recent incidents
    const jql = 'project = FAI order by created desc';
    const bodyData = JSON.stringify({
        jql,
        maxResults: 20,
        fields: ['key', 'issuetype', 'customfield_10064', 'customfield_10065', 'customfield_10047', 'customfield_10048']
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
                console.log(`Found ${result.issues.length} tickets`);

                result.issues.forEach(issue => {
                    const fields = issue.fields;
                    const hasSLA = fields.customfield_10064 || fields.customfield_10065 || fields.customfield_10047 || fields.customfield_10048;

                    if (hasSLA) {
                        console.log(`\nTicket: ${issue.key} (${fields.issuetype.name})`);
                        if (fields.customfield_10064) console.log(`  Resolución: ${JSON.stringify(fields.customfield_10064).substring(0, 100)}`);
                        if (fields.customfield_10065) console.log(`  Respuesta: ${JSON.stringify(fields.customfield_10065).substring(0, 100)}`);
                        if (fields.customfield_10047) console.log(`  Time to Res: ${JSON.stringify(fields.customfield_10047).substring(0, 100)}`);
                        if (fields.customfield_10048) console.log(`  Time to Resp: ${JSON.stringify(fields.customfield_10048).substring(0, 100)}`);
                    } else {
                        // console.log(`Ticket: ${issue.key} - NO SLA`);
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
