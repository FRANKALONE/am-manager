// Script to check FAIN worklogs and duplicates
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFainData() {
    console.log('=== FAIN Work Package Data ===\n');

    // Find FAIN WP
    const wp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' }
        }
    });

    if (!wp) {
        console.log('FAIN WP not found');
        return;
    }

    console.log(`WP ID: ${wp.id}`);
    console.log(`WP Name: ${wp.name}`);
    console.log(`WP Type: ${wp.contractType}\n`);

    // Check WorklogDetails
    const worklogs = await prisma.worklogDetail.findMany({
        where: { workPackageId: wp.id },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    console.log(`Total WorklogDetails: ${worklogs.length}\n`);

    // Group by month
    const byMonth = {};
    worklogs.forEach(w => {
        const key = `${w.month}/${w.year}`;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(w);
    });

    console.log('WorklogDetails by month:');
    Object.entries(byMonth).forEach(([month, logs]) => {
        console.log(`\n${month}:`);
        logs.forEach(w => {
            console.log(`  ${w.issueKey} (${w.issueType}): ${w.timeSpentHours}h`);
        });
    });

    // Check Manual Consumptions
    const manualRegs = await prisma.regularization.findMany({
        where: {
            workPackageId: wp.id,
            type: 'MANUAL_CONSUMPTION'
        },
        orderBy: { date: 'asc' }
    });

    console.log(`\n\nManual Consumptions: ${manualRegs.length}`);
    manualRegs.forEach(r => {
        const d = new Date(r.date);
        console.log(`  ${d.getMonth() + 1}/${d.getFullYear()}: ${r.ticketId} - ${r.quantity}h (reviewed: ${r.reviewedForDuplicates})`);
    });

    await prisma.$disconnect();
}

checkFainData().catch(console.error);
