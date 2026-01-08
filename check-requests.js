const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const requests = await prisma.$queryRaw`SELECT r.*, c.name as "clientName" FROM "JiraUserRequest" r JOIN "Client" c ON r."clientId" = c.id ORDER BY r."createdAt" DESC LIMIT 5`;

        console.log('--- ÚLTIMAS 5 SOLICITUDES JIRA ---');
        requests.forEach(r => {
            console.log(`ID: ${r.id}`);
            console.log(`Tipo: ${r.type}`);
            console.log(`Cliente: ${r.clientName}`);
            console.log(`Status: ${r.status}`);
            console.log(`Email: ${r.email || 'N/A'}`);
            console.log(`DisplayName: ${r.displayName || 'N/A'}`);
            console.log(`AccountId: ${r.jiraAccountId || 'N/A'}`);
            console.log(`Fecha: ${r.createdAt}`);
            console.log('------------------------------');
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
