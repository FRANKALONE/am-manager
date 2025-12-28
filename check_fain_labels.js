const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00811MANT0001.1.4';
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

    console.log(`--- FAIN (${wpId}) DETAILS ---`);
    if (logs.length === 0) {
        console.log('No logs found for FAIN in month 9 year 2025');
    }
    logs.forEach(l => {
        console.log(`Key: ${l.issueKey}, BillingMode: ${l.billingMode}, TipoImputacion: ${l.tipoImputacion}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
