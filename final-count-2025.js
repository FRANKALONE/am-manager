
const https = require('https');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const jiraUrl = env.JIRA_URL?.trim();
const jiraEmail = env.JIRA_USER_EMAIL?.trim();
const jiraToken = env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function searchJira(jql) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            jql,
            maxResults: 1000,
            fields: ['key', 'status', 'resolution']
        });
        const url = `${jiraUrl}/rest/api/3/search/jql`;
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.write(body);
        req.end();
    });
}

async function main() {
    const jql = 'issuetype = "Petición de Evolutivo" AND created >= "2025-01-01" AND status = "Cerrado"';
    console.log(`Searching JIRA: ${jql}`);
    const res = await searchJira(jql);
    if (res && res.issues) {
        const total = res.issues.length;
        const approved = res.issues.filter(i => i.fields?.resolution?.name === 'Aprobada').length;
        const rejected = res.issues.filter(i => i.fields?.resolution?.name === 'Rechazada').length;
        const other = total - approved - rejected;

        console.log(`RESULTADO FINAL 2025:`);
        console.log(`Total "Cerrado": ${total}`);
        console.log(`Aprobadas: ${approved}`);
        console.log(`Rechazadas: ${rejected}`);
        console.log(`Otras: ${other}`);
    } else {
        console.log('Error in search');
    }
}

main();
