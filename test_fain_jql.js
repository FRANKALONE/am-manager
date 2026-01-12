const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function testQuery() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    const projectKeys = ['FAI'];
    const jql = `project IN (${projectKeys.join(',')}) AND issuetype = "Evolutivo"`;

    console.log(`Testing JQL: ${jql}`);

    const bodyData = JSON.stringify({
        jql,
        maxResults: 10,
        fields: ['key']
    });

    const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    }, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('Response Keys:', Object.keys(json));
                console.log('Total:', json.total);
                console.log('Next Page Token:', json.nextPageToken);
            } catch (e) {
                console.error('Error parsing response:', e);
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(bodyData);
    req.end();
}

testQuery();
