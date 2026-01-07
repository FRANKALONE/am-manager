const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local si dotenv no está disponible
if (!process.env.JIRA_URL) {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key.trim()] = value;
            }
        });
    }
}

const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();

if (!jiraUrl || !jiraEmail || !jiraToken) {
    console.error('❌ Faltan variables de entorno JIRA');
    process.exit(1);
}

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function getAllServiceDesks() {
    const url = `${jiraUrl}/rest/servicedeskapi/servicedesk`;

    console.log('🔍 Obteniendo todos los Service Desks...\n');

    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error(`❌ Error: ${response.status}`);
        const text = await response.text();
        console.error(text);
        return;
    }

    const data = await response.json();
    const serviceDesks = data.values || [];

    console.log(`✅ Total Service Desks encontrados: ${serviceDesks.length}\n`);
    console.log('📋 Lista de Service Desks:\n');

    serviceDesks.forEach((sd, index) => {
        console.log(`${index + 1}. ${sd.projectName}`);
        console.log(`   ID: ${sd.id}`);
        console.log(`   Clave: ${sd.projectKey}`);
        console.log('');
    });

    // Buscar específicamente ITR
    const itr = serviceDesks.find(sd => sd.projectKey === 'ITR');
    if (itr) {
        console.log('✅ Service Desk ITR encontrado:');
        console.log(JSON.stringify(itr, null, 2));
    } else {
        console.log('❌ Service Desk ITR NO encontrado');
        console.log('\nClaves disponibles:', serviceDesks.map(sd => sd.projectKey).join(', '));
    }
}

getAllServiceDesks().catch(console.error);
