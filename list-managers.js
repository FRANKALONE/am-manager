const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCurrentManagers() {
    try {
        const params = await prisma.parameter.findMany({
            where: { category: 'MANAGER' }
        });
        console.log('Current MANAGER parameters:', JSON.stringify(params, null, 2));
        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
        await prisma.$disconnect();
    }
}
listCurrentManagers();
