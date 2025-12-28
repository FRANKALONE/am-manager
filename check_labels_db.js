const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'FARLABO';
    const month = 9;
    const year = 2025;

    const logs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wpId,
            month,
            year
        },
        select: {
            issueKey: true,
            billingMode: true,
            tipoImputacion: true
        }
    });

    console.log('--- WORKLOG DETAILS ---');
    logs.forEach(l => {
        console.log(`Key: ${l.issueKey}, BillingMode: ${l.billingMode}, TipoImputacion: ${l.tipoImputacion}`);
    });

    const tickets = await prisma.ticket.findMany({
        where: {
            workPackageId: wpId,
            month,
            year
        }
    });

    console.log('\n--- TICKETS ---');
    tickets.forEach(t => {
        console.log(`Key: ${t.issueKey}, BillingMode: ${t.billingMode}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
