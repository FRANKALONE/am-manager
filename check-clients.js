const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClients() {
    try {
        const clients = await prisma.client.findMany({
            take: 10,
            select: { id: true, name: true, manager: true }
        });
        console.log('Client Managers:', JSON.stringify(clients, null, 2));
        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
        await prisma.$disconnect();
    }
}
checkClients();
