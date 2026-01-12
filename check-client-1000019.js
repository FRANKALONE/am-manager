const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClient() {
    const clientId = '1000019';
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { workPackages: true }
    });

    console.log('Client Data:', JSON.stringify(client, null, 2));
}

checkClient()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
