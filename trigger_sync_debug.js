const { handleSync } = require('./app/actions/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00811MANT0001.1.4';
    console.log(`Starting sync for ${wpId}...`);

    // We need to mock the addLog function or just let it console.log
    const result = await handleSync(wpId);
    console.log('Sync result:', result);

    // Check the DB after sync
    const logs = await prisma.worklogDetail.findMany({
        where: {
            issueKey: 'FAI-411',
            workPackageId: wpId,
            month: 9,
            year: 2025
        },
        select: {
            issueKey: true,
            billingMode: true
        }
    });

    console.log('--- POST-SYNC CHECK (FAI-411) ---');
    logs.forEach(l => {
        console.log(`Key: ${l.issueKey}, BillingMode: ${l.billingMode}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
