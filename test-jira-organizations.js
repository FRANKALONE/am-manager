const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Script de prueba para obtener organizaciones y usuarios de cliente en JIRA Service Management
 * 
 * Este script demuestra cómo:
 * 1. Obtener todos los Service Desks (proyectos de tipo Service Management)
 * 2. Obtener las organizaciones asociadas a cada Service Desk
 * 3. Obtener los usuarios de cliente de cada organización
 */

// Cargar variables de entorno desde .env.local
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=:#]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
} catch (error) {
    console.warn('⚠️  No se pudo cargar .env.local:', error.message);
}

// Configuración desde variables de entorno
const jiraUrl = process.env.JIRA_URL || 'YOUR_JIRA_URL';
const jiraEmail = process.env.JIRA_USER_EMAIL || 'YOUR_EMAIL';
const jiraToken = process.env.JIRA_API_TOKEN || 'YOUR_TOKEN';

const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

// Función auxiliar para hacer peticiones HTTPS
function makeRequest(endpoint, isServiceDeskApi = false) {
    return new Promise((resolve, reject) => {
        const apiPath = isServiceDeskApi
            ? `/rest/servicedeskapi${endpoint}`
            : `/rest/api/3${endpoint}`;

        const url = `${jiraUrl}${apiPath}`;

        console.log(`\n🔍 Haciendo petición a: ${url}`);

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
                        reject(new Error(`Error al parsear respuesta: ${e.message}`));
                    }
                } else {
                    reject(new Error(`Error ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// 1. Obtener todos los Service Desks
async function getServiceDesks() {
    console.log('\n📋 PASO 1: Obteniendo Service Desks...');
    const response = await makeRequest('/servicedesk', true);
    return response.values || [];
}

// 2. Obtener organizaciones de un Service Desk
async function getOrganizations(serviceDeskId) {
    console.log(`\n🏢 PASO 2: Obteniendo organizaciones para Service Desk ID: ${serviceDeskId}...`);
    const response = await makeRequest(`/servicedesk/${serviceDeskId}/organization`, true);
    return response.values || [];
}

// 3. Obtener usuarios de una organización
async function getOrganizationUsers(organizationId) {
    console.log(`\n👥 PASO 3: Obteniendo usuarios para Organización ID: ${organizationId}...`);
    const response = await makeRequest(`/organization/${organizationId}/user`, true);
    return response.values || [];
}

// Función principal
async function main() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  TEST: Obtener Usuarios de Cliente por Organización en JIRA');
        console.log('═══════════════════════════════════════════════════════════════');

        // Obtener todos los Service Desks
        const serviceDesks = await getServiceDesks();
        console.log(`\n✅ Se encontraron ${serviceDesks.length} Service Desk(s)`);

        if (serviceDesks.length === 0) {
            console.log('\n⚠️  No se encontraron Service Desks. Verifica que tu usuario tenga permisos.');
            return;
        }

        // Procesar cada Service Desk
        for (const serviceDesk of serviceDesks) {
            console.log('\n' + '─'.repeat(70));
            console.log(`📊 Service Desk: ${serviceDesk.projectName} (${serviceDesk.projectKey})`);
            console.log(`   ID: ${serviceDesk.id}`);
            console.log('─'.repeat(70));

            try {
                // Obtener organizaciones del Service Desk
                const organizations = await getOrganizations(serviceDesk.id);
                console.log(`\n   ✅ Organizaciones encontradas: ${organizations.length}`);

                if (organizations.length === 0) {
                    console.log('   ℹ️  Este Service Desk no tiene organizaciones asociadas.');
                    continue;
                }

                // Procesar cada organización
                for (const org of organizations) {
                    console.log(`\n   🏢 Organización: ${org.name}`);
                    console.log(`      ID: ${org.id}`);

                    try {
                        // Obtener usuarios de la organización
                        const users = await getOrganizationUsers(org.id);
                        console.log(`      👥 Usuarios: ${users.length}`);

                        if (users.length > 0) {
                            console.log('      ┌─ Lista de usuarios:');
                            users.forEach((user, index) => {
                                const prefix = index === users.length - 1 ? '└─' : '├─';
                                console.log(`      ${prefix} ${user.displayName || user.name}`);
                                console.log(`         Email: ${user.emailAddress || 'N/A'}`);
                                console.log(`         Account ID: ${user.accountId}`);
                                console.log(`         Tipo: ${user.accountType || 'N/A'}`);
                            });
                        } else {
                            console.log('      ℹ️  Esta organización no tiene usuarios.');
                        }
                    } catch (error) {
                        console.error(`      ❌ Error al obtener usuarios: ${error.message}`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error al obtener organizaciones: ${error.message}`);
            }
        }

        console.log('\n' + '═'.repeat(70));
        console.log('✅ Proceso completado exitosamente');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar
main();
