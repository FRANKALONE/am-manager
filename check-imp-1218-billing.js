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

console.log('🔍 Verificando campo Modo de Facturación de IMP-1218...\n');

const bodyData = JSON.stringify({
    jql: 'key = IMP-1218',
    maxResults: 1,
    fields: ['key', 'summary', 'issuetype', 'customfield_10121', 'timeoriginalestimate', 'created']
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
            if (result.issues && result.issues.length > 0) {
                const issue = result.issues[0];
                console.log('✅ Ticket encontrado:', issue.key);
                console.log('   Summary:', issue.fields.summary);
                console.log('   Issue Type:', issue.fields.issuetype?.name);
                console.log('   Created:', issue.fields.created);
                console.log('   Original Estimate:', issue.fields.timeoriginalestimate, 'seconds');
                if (issue.fields.timeoriginalestimate) {
                    console.log('   Original Estimate:', issue.fields.timeoriginalestimate / 3600, 'hours');
                }
                console.log('\n📋 Campo customfield_10121 (Modo de Facturación):');
                console.log('   Tipo:', typeof issue.fields.customfield_10121);
                console.log('   Valor RAW:', JSON.stringify(issue.fields.customfield_10121, null, 2));

                // Simular la lógica del sync
                const billingModeRaw = issue.fields.customfield_10121;
                const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || 'Bolsa de Horas';
                console.log('\n🔧 Procesamiento del sync:');
                console.log('   billingMode procesado:', billingMode);
                console.log('   isBolsa (billingMode === "Bolsa de Horas"):', billingMode === 'Bolsa de Horas');

                if (billingMode !== 'Bolsa de Horas') {
                    console.log('\n❌ PROBLEMA ENCONTRADO:');
                    console.log('   El valor NO es exactamente "Bolsa de Horas"');
                    console.log('   Valor esperado: "Bolsa de Horas"');
                    console.log('   Valor actual:', billingMode);
                }
            } else {
                console.log('❌ Ticket no encontrado');
            }
        } else {
            console.log('❌ Error:', res.statusCode);
            console.log(data);
        }
    });
});

req.on('error', err => console.error('❌ Error:', err.message));
req.write(bodyData);
req.end();
