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

const jql = `project in (EVSN) AND created >= "2024-11-30" AND created <= "2024-12-31" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")`;

const searchUrl = new URL(`${jiraUrl}/rest/api/latest/search`);
const requestBody = JSON.stringify({
    jql: jql,
    maxResults: 0,
    fields: ['key']
});

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

const req = https.request({
    hostname: searchUrl.hostname,
    port: 443,
    path: searchUrl.pathname,
    method: 'POST',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const result = JSON.parse(data);
        console.log('✅ Total tickets:', result.total);
        process.exit(0);
    });
});
req.on('error', (err) => console.error('Error:', err));
req.write(requestBody);
req.end();
