// Script to check FAIN worklogs after sync
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFainAfterSync() {
    console.log('=== Checking FAIN after sync ===\n');

    // Find FAIN WP
    const wp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' },
            contractType: 'BOLSA'
        }
    });

    if (!wp) {
        console.log('FAIN BOLSA WP not found');
        return;
    }

    console.log(`WP: ${wp.id} - ${wp.name}`);
    console.log(`Last synced: ${wp.lastSyncedAt}\n`);

    // Check worklogs in September 2025
    const septWorklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 9
        },
        orderBy: { issueKey: 'asc' }
    });

    console.log(`Worklogs in September 2025: ${septWorklogs.length}`);

    const byTicket = {};
    septWorklogs.forEach(w => {
        if (!byTicket[w.issueKey]) {
            byTicket[w.issueKey] = { hours: 0, type: w.issueType };
        }
        byTicket[w.issueKey].hours += w.timeSpentHours;
    });

    Object.entries(byTicket).forEach(([key, data]) => {
        console.log(`  ${key} (${data.type}): ${data.hours.toFixed(2)}h`);
    });

    // Check specifically for FAI-411
    const fai411 = septWorklogs.filter(w => w.issueKey === 'FAI-411');
    console.log(`\nFAI-411 worklogs: ${fai411.length}`);
    fai411.forEach(w => {
        console.log(`  ${w.timeSpentHours}h on ${new Date(w.startDate).toLocaleDateString('es-ES')}`);
    });

    // Check November 2025
    const novWorklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 11
        },
        orderBy: { issueKey: 'asc' }
    });

    console.log(`\nWorklogs in November 2025: ${novWorklogs.length}`);

    const novByTicket = {};
    novWorklogs.forEach(w => {
        if (!novByTicket[w.issueKey]) {
            novByTicket[w.issueKey] = { hours: 0, type: w.issueType };
        }
        novByTicket[w.issueKey].hours += w.timeSpentHours;
    });

    Object.entries(novByTicket).forEach(([key, data]) => {
        console.log(`  ${key} (${data.type}): ${data.hours.toFixed(2)}h`);
    });

    await prisma.$disconnect();
}

checkFainAfterSync().catch(console.error);
