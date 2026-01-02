const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) process.env[key.trim()] = valueParts.join('=').trim();
    });
}
loadEnv();

async function inspectEvolutivosDetailed() {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    // Search for issues of type Evolutivo and their sub-tasks in one go or linked
    const jql = 'issuetype IN (Evolutivo, "Hitos Evolutivos") ORDER BY created DESC';
    console.log(`Searching with JQL: ${jql}`);

    const bodyData = JSON.stringify({
        jql,
        maxResults: 20,
        fields: ['key', 'summary', 'issuetype', 'status', 'customfield_10121', 'assignee', 'duedate', 'parent']
    });

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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
                const searchRes = JSON.parse(data);
                const issues = searchRes.issues;
                const parents = issues.filter(i => i.fields.issuetype.name === 'Evolutivo');
                const hitos = issues.filter(i => i.fields.issuetype.name === 'Hitos Evolutivos');

                parents.forEach(p => {
                    console.log(`\nEVOLUTIVO: ${p.key} - ${p.fields.summary}`);
                    console.log(`  Gestor: ${p.fields.assignee?.displayName || 'None'}`);
                    console.log(`  Status: ${p.fields.status.name}`);

                    const pSlas = hitos.filter(h => h.fields.parent?.key === p.key);
                    if (pSlas.length > 0) {
                        console.log(`  Hitos (${pSlas.length}):`);
                        pSlas.forEach(h => {
                            console.log(`    - ${h.key}: ${h.fields.summary}`);
                            console.log(`      Vencimiento: ${h.fields.duedate || 'None'}`);
                            console.log(`      Responsable: ${h.fields.assignee?.displayName || 'None'}`);
                            console.log(`      Estado: ${h.fields.status.name}`);
                        });
                    } else {
                        console.log('  No hitos found in this batch.');
                    }
                });
            } catch (e) {
                console.error(e);
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(bodyData);
    req.end();
}

inspectEvolutivosDetailed();
