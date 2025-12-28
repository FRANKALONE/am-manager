// Script to check FARLABO BD worklog for FAR-947 in August 2025
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFarlaboAugust() {
    console.log('=== FARLABO BD - August 2025 - FAR-947 ===\n');

    // Find FARLABO BD WP
    const wp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FARLABO', mode: 'insensitive' },
            contractType: 'BD'
        }
    });

    if (!wp) {
        console.log('FARLABO BD WP not found');
        return;
    }

    console.log(`WP ID: ${wp.id}`);
    console.log(`WP Name: ${wp.name}\n`);

    // Check MonthlyMetric for August 2025
    const metric = await prisma.monthlyMetric.findFirst({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 8
        }
    });

    console.log('1. MonthlyMetric for August 2025:');
    if (metric) {
        console.log(`   Consumed Hours: ${metric.consumedHours}h`);
    } else {
        console.log('   No metric found');
    }

    // Check WorklogDetails for August 2025
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 8
        }
    });

    console.log(`\n2. WorklogDetails for August 2025 (${worklogs.length} records):`);
    worklogs.forEach(w => {
        console.log(`   ${w.issueKey}: ${w.timeSpentHours}h - ${w.issueSummary}`);
    });

    // Check specifically for FAR-947
    const far947 = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            issueKey: 'FAR-947'
        }
    });

    console.log(`\n3. All WorklogDetails for FAR-947 (${far947.length} records):`);
    far947.forEach(w => {
        console.log(`   ${w.month}/${w.year}: ${w.timeSpentHours}h`);
    });

    // Check Regularizations for August 2025
    const regs = await prisma.regularization.findMany({
        where: {
            workPackageId: wp.id
        }
    });

    const augustRegs = regs.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === 2025 && d.getMonth() + 1 === 8;
    });

    console.log(`\n4. Regularizations for August 2025 (${augustRegs.length} records):`);
    augustRegs.forEach(r => {
        console.log(`   ${r.type}: ${r.quantity}h - ${r.description}`);
    });

    await prisma.$disconnect();
}

checkFarlaboAugust().catch(console.error);
