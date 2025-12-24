const https = require('https');
const fs = require('fs');

const envPath = require('path').join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const jiraUrl = env.JIRA_URL?.trim();
const jiraEmail = env.JIRA_USER_EMAIL?.trim();
const jiraToken = env.JIRA_API_TOKEN?.trim();

const projectKeys = 'IMP';
const startDateStr = '2024-04-01';
const endDateStr = '2025-03-31';

const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")`;

console.log('Testing JIRA API v2 GET...\n');

const searchUrl = new URL(`${jiraUrl}/rest/api/2/search`);
searchUrl.searchParams.append('jql', jql);
searchUrl.searchParams.append('maxResults', '10');
searchUrl.searchParams.append('fields', 'key,summary,issuetype,created');

const req = https.request({
    hostname: searchUrl.hostname,
    port: 443,
    path: searchUrl.pathname + searchUrl.search,
    method: 'GET',
    headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Accept': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const result = JSON.parse(data);
            console.log('Total issues:', result.total);
            console.log('Returned issues:', result.issues?.length || 0);
            if (result.issues && result.issues.length > 0) {
                console.log('\nFirst few issues:');
                result.issues.slice(0, 3).forEach(issue => {
                    console.log(`  - ${issue.key}: ${issue.fields.issuetype?.name} (created: ${issue.fields.created})`);
                });
            }
            if (result.errorMessages) {
                console.log('Errors:', result.errorMessages);
            }
        } catch (e) {
            console.log('Response:', data);
        }
        process.exit(0);
    });
});
req.on('error', (err) => console.error('Error:', err));
req.end();
