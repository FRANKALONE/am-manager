const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wlogs = await prisma.worklogDetail.findMany({
        where: {
            issueKey: 'FAI-320',
            tipoImputacion: 'Consumo Manual'
        }
    });

    console.log(`Found ${wlogs.length} manual consumption worklogs for FAI-320.`);
    console.log(JSON.stringify(wlogs, null, 2));

    const regs = await prisma.regularization.findMany({
        where: {
            type: 'MANUAL_CONSUMPTION',
            ticketId: 'FAI-320'
        }
    });

    console.log(`Found ${regs.length} manual consumption regularizations for FAI-320.`);
    console.log(JSON.stringify(regs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
