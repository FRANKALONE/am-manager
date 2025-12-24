const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTempoIds() {
    const wps = await prisma.workPackage.findMany({
        select: { id: true, name: true, tempoAccountId: true }
    });

    console.log('WPs con Tempo Account ID:');
    wps.forEach(wp => {
        if (wp.tempoAccountId) {
            console.log(`${wp.id.padEnd(20)} | ${wp.tempoAccountId}`);
        }
    });

    await prisma.$disconnect();
}

checkTempoIds();
