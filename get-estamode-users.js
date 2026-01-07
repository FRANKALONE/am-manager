const https = require('https');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath).toString();
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values) process.env[key.trim()] = values.join('=').trim();
    });
}

const jiraUrl = process.env.JIRA_URL?.trim();
const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
const jiraToken = process.env.JIRA_API_TOKEN?.trim();

if (!jiraUrl || !jiraEmail || !jiraToken) {
    console.error('❌ Error: Faltan variables de entorno');
    process.exit(1);
}

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

function makeRequest(endpoint, isServiceDeskApi = false) {
    return new Promise((resolve, reject) => {
        const apiPath = isServiceDeskApi
            ? `/rest/servicedeskapi${endpoint}`
            : `/rest/api/3${endpoint}`;

        const url = `${jiraUrl}${apiPath}`;

        https.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Error al parsear: ${e.message}`));
                    }
                } else {
                    reject(new Error(`Error ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  Usuarios de Cliente - ESTYTE ESTTALACIONES (EST)');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Obtener Service Desks directamente
        console.log('🔍 Obteniendo Service Desks...');
        const serviceDesksResponse = await makeRequest('/servicedesk', true);
        const serviceDesks = serviceDesksResponse.values || [];

        console.log(`✅ Se encontraron ${serviceDesks.length} Service Desk(s)\n`);

        // Buscar el Service Desk con projectKey = EST
        const ESTyteServiceDesk = serviceDesks.find(sd => sd.projectKey === 'EST');

        if (!ESTyteServiceDesk) {
            console.error('❌ No se encontró Service Desk con clave "EST"');
            console.log('\n📋 Service Desks disponibles:');
            serviceDesks.forEach(sd => console.log(`   - ${sd.projectName} (${sd.projectKey})`));
            return;
        }

        console.log(`✅ Service Desk encontrado: ${ESTyteServiceDesk.projectName}`);
        console.log(`   Project Key: ${ESTyteServiceDesk.projectKey}`);
        console.log(`   Service Desk ID: ${ESTyteServiceDesk.id}`);

        // Obtener organizaciones
        console.log('\n🏢 Obteniendo organizaciones...');
        const orgsResponse = await makeRequest(`/servicedesk/${ESTyteServiceDesk.id}/organization`, true);
        const organizations = orgsResponse.values || [];

        if (organizations.length === 0) {
            console.log('⚠️  Este Service Desk no tiene organizaciones configuradas');
            return;
        }

        console.log(`✅ Se encontraron ${organizations.length} organización(es)\n`);

        // Obtener usuarios de cada organización
        let totalUsers = 0;

        for (const org of organizations) {
            console.log('─'.repeat(70));
            console.log(`🏢 Organización: ${org.name}`);
            console.log(`   ID: ${org.id}`);

            try {
                const usersResponse = await makeRequest(`/organization/${org.id}/user?start=0&limit=1000`, true);
                const users = usersResponse.values || [];

                console.log(`   👥 Total de usuarios: ${users.length}\n`);

                if (users.length > 0) {
                    totalUsers += users.length;

                    users.forEach((user, index) => {
                        const prefix = index === users.length - 1 ? '   └─' : '   ├─';
                        console.log(`${prefix} ${user.displayName}`);
                        console.log(`   │  📧 Email: ${user.emailAddress || 'N/A'}`);
                        console.log(`   │  🆔 Account ID: ${user.accountId}`);
                        console.log(`   │  📊 Tipo: ${user.accountType || 'N/A'}`);
                        console.log(`   │  ✓ Activo: ${user.active ? 'Sí' : 'No'}`);
                        if (index < users.length - 1) {
                            console.log('   │');
                        }
                    });
                } else {
                    console.log('   ℹ️  Esta organización no tiene usuarios');
                }
            } catch (error) {
                console.error(`   ❌ Error al obtener usuarios: ${error.message}`);
            }
        }

        console.log('─'.repeat(70));
        console.log(`\n📊 RESUMEN:`);
        console.log(`   • Proyecto: ${ESTyteServiceDesk.projectName} (${ESTyteServiceDesk.projectKey})`);
        console.log(`   • Organizaciones: ${organizations.length}`);
        console.log(`   • Total de usuarios de cliente: ${totalUsers}`);
        console.log('\n✅ Proceso completado\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
