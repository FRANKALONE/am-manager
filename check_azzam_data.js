// Script to verify AZZAM monthly metrics and worklogs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAzzamData() {
    const wpId = 'AMA00012MANT0001.1.1'; // AZZAM

    console.log('=== AZZAM Data Verification ===\n');

    // 1. Check MonthlyMetrics
    const metrics = await prisma.monthlyMetric.findMany({
        where: { workPackageId: wpId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    console.log(`1. MonthlyMetrics (${metrics.length} records):`);
    metrics.forEach(m => {
        console.log(`   ${m.month}/${m.year}: ${m.consumedHours}h`);
    });

    // 2. Check WorklogDetails
    const worklogs = await prisma.worklogDetail.findMany({
        where: { workPackageId: wpId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    console.log(`\n2. WorklogDetails (${worklogs.length} records):`);
    const monthlySum = {};
    worklogs.forEach(w => {
        const key = `${w.month}/${w.year}`;
        monthlySum[key] = (monthlySum[key] || 0) + w.timeSpentHours;
    });
    Object.entries(monthlySum).forEach(([key, hours]) => {
        console.log(`   ${key}: ${hours.toFixed(2)}h`);
    });

    // 3. Check Manual Consumptions (should be empty after cleanup)
    const manualRegs = await prisma.regularization.findMany({
        where: {
            workPackageId: wpId,
            type: 'MANUAL_CONSUMPTION'
        }
    });

    console.log(`\n3. Manual Consumptions (${manualRegs.length} records):`);
    manualRegs.forEach(r => {
        const date = new Date(r.date);
        console.log(`   ${date.getMonth() + 1}/${date.getFullYear()}: ${r.quantity}h (Ticket: ${r.ticketId})`);
    });

    // 4. Check Evolutivo T&M worklogs specifically
    const evolutivoWorklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wpId,
            issueType: 'Evolutivo'
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    console.log(`\n4. Evolutivo Worklogs (${evolutivoWorklogs.length} records):`);
    evolutivoWorklogs.forEach(w => {
        console.log(`   ${w.month}/${w.year}: ${w.issueKey} - ${w.timeSpentHours}h`);
    });

    await prisma.$disconnect();
}

checkAzzamData().catch(console.error);
