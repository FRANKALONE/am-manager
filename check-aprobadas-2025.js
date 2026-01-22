
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
            maxResults: 50,
            fields: ['key', 'status', 'resolution', 'issuetype']
        });
        // Using same endpoint as evolutivo-proposals.ts
        const url = `${jiraUrl}/rest/api/3/search/jql`;
        console.log(`Connecting to: ${url}`);
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
                    const parsed = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        console.log(`Error Status: ${res.statusCode}`);
                        console.log(`Error Body: ${data}`);
                    }
                    resolve(parsed);
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', (e) => {
            console.log(`Request Error: ${e.message}`);
            resolve(null);
        });
        req.write(body);
        req.end();
    });
}

async function main() {
    const jql = 'issuetype = "Petición de Evolutivo" AND created >= "2025-01-01" AND status = "Cerrado"';
    console.log(`Searching JIRA: ${jql}`);
    const res = await searchJira(jql);
    if (res && res.issues) {
        console.log(`Found ${res.issues.length} closed petitions in 2025`);
        const stats = {};
        res.issues.forEach(i => {
            const resName = i.fields?.resolution?.name || 'No Resolution';
            stats[resName] = (stats[resName] || 0) + 1;
        });
        console.log('Resolution Stats:');
        console.log(JSON.stringify(stats, null, 2));
    } else {
        console.log('No result or error');
    }
}

main();
