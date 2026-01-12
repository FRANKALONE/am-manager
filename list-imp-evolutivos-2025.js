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

console.log('🔍 Buscando TODOS los Evolutivos del proyecto IMP con Bolsa de Horas...\n');

const jql = 'project = IMP AND issuetype = Evolutivo AND "Modo de Facturación" = "Bolsa de Horas" AND created >= "2025-01-01" AND created <= "2025-12-31"';

const bodyData = JSON.stringify({
    jql,
    maxResults: 100,
    fields: ['key', 'summary', 'created', 'customfield_10121', 'timeoriginalestimate']
});

const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
        'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const result = JSON.parse(data);
            console.log(`✅ Encontrados ${result.total} Evolutivos en 2025\n`);

            let withEstimate = 0;
            let withoutEstimate = 0;

            result.issues.forEach((issue, index) => {
                const created = new Date(issue.fields.created);
                const month = created.getMonth() + 1;
                const year = created.getFullYear();
                const estimate = issue.fields.timeoriginalestimate;
                const hours = estimate ? (estimate / 3600).toFixed(2) : 'NO';

                if (estimate) {
                    withEstimate++;
                    console.log(`${index + 1}. ${issue.key} - ${month.toString().padStart(2, '0')}/${year} - ${hours}h`);
                } else {
                    withoutEstimate++;
                    console.log(`${index + 1}. ${issue.key} - ${month.toString().padStart(2, '0')}/${year} - ❌ SIN ESTIMACIÓN`);
                }
            });

            console.log(`\n📊 Resumen:`);
            console.log(`   Con estimación: ${withEstimate}`);
            console.log(`   Sin estimación: ${withoutEstimate}`);
            console.log(`\n💡 Los tickets SIN estimación NO se contabilizan en el consumo`);
        } else {
            console.log('❌ Error:', res.statusCode);
            console.log(data);
        }
    });
});

req.on('error', err => console.error('❌ Error:', err.message));
req.write(bodyData);
req.end();
