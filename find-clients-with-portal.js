const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findClientsWithPortal() {
    const clients = await prisma.client.findMany({
        where: {
            OR: [
                { portalUrl: { not: null } },
                { clientPortalUrl: { not: null } }
            ]
        },
        select: {
            id: true,
            name: true,
            portalUrl: true,
            clientPortalUrl: true,
            jiraProjectKey: true
        }
    });

    console.log(`Found ${clients.length} clients with portals.`);
    console.log('Sample Data:', JSON.stringify(clients.slice(0, 10), null, 2));
}

findClientsWithPortal()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
