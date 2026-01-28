const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNulls() {
    const count = await prisma.ticket.count({
        where: {
            resolution: null
        }
    });
    console.log(`Tickets with resolution=null: ${count}`);

    const countEmpty = await prisma.ticket.count({
        where: {
            resolution: ""
        }
    });
    console.log(`Tickets with resolution='': ${countEmpty}`);

    const sample = await prisma.ticket.findFirst({
        where: { resolution: null },
        select: { issueKey: true, status: true, resolution: true }
    });
    console.log('Sample null resolution:', sample);

    await prisma.$disconnect();
}

checkNulls().catch(console.error);
