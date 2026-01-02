const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching clients...');
        const clients = await prisma.client.findMany({
            select: { id: true, name: true, jiraProjectKey: true, portalUrl: true }
        });
        console.log('Total clients found:', clients.length);
        console.log('First 5 clients:', JSON.stringify(clients.slice(0, 5), null, 2));
    } catch (error) {
        console.error('Error fetching clients:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
