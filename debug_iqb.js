const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clientName = 'INDUSTRIAS QUIMICAS DE BADAJOZ SA';
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'INDUSTRIAS QUIMICAS', mode: 'insensitive' } }
    });

    console.log('Client Data:');
    console.log(JSON.stringify(client, null, 2));

    if (!client) {
        const allClients = await prisma.client.findMany({
            select: { id: true, name: true }
        });
        console.log('\nAll Clients in DB:', allClients);
        return;
    }

    const wps = await prisma.workPackage.findMany({
        where: { clientId: client.id }
    });

    console.log(`\nFound ${wps.length} Work Packages for client ID ${client.id}:`);
    wps.forEach(wp => {
        console.log(`- ${wp.id}: ${wp.name} (ClientName in WP: ${wp.clientName})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
