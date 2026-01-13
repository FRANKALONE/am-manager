// Script para verificar si los custom fields están disponibles en JIRA
require('dotenv').config();
const https = require('https');

const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();
const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function testCustomFields() {
    console.log('🔍 Verificando custom fields en JIRA...\n');

    // Buscar un ticket de cada proyecto para verificar los custom fields
    const testCases = [
        { project: 'FAI', ticket: 'FAI-551', customField: 'customfield_10353' },
        { project: 'MOL', ticket: 'MOL-2518', customField: 'customfield_10176' },
    ];

    for (const test of testCases) {
        console.log(`\n📋 Verificando ${test.ticket} (${test.project}):`);
        console.log('='.repeat(80));

        const bodyData = JSON.stringify({
            jql: `key = "${test.ticket}"`,
            fields: ['key', 'summary', test.customField]
        });

        const result = await new Promise((resolve) => {
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
                        if (res.statusCode === 200) {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } else {
                            console.error(`   ❌ Error ${res.statusCode}: ${data}`);
                            resolve(null);
                        }
                    } catch (e) {
                        console.error(`   ❌ Parse error: ${e.message}`);
                        resolve(null);
                    }
                });
            });
            req.on('error', (err) => {
                console.error(`   ❌ Request error: ${err.message}`);
                resolve(null);
            });
            req.write(bodyData);
            req.end();
        });

        if (result && result.issues && result.issues.length > 0) {
            const issue = result.issues[0];
            console.log(`   ✅ Ticket encontrado: ${issue.key}`);
            console.log(`   Summary: ${issue.fields.summary}`);
            console.log(`   \n   🔎 Valor del custom field ${test.customField}:`);

            const fieldValue = issue.fields[test.customField];
            if (fieldValue) {
                console.log(`   ✅ EXISTE: ${JSON.stringify(fieldValue, null, 2)}`);
            } else {
                console.log(`   ❌ NO EXISTE O ES NULL`);
                console.log(`   \n   📝 Todos los fields disponibles:`);
                console.log(JSON.stringify(Object.keys(issue.fields), null, 2));
            }
        } else {
            console.log(`   ❌ No se pudo obtener el ticket`);
        }
    }
}

testCustomFields().catch(console.error);
