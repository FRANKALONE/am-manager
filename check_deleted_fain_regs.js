// Script to check deleted manual consumptions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeletedRegs() {
    console.log('=== Checking Manual Consumptions for FAIN ===\n');

    const wp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' }
        }
    });

    if (!wp) {
        console.log('FAIN WP not found');
        return;
    }

    // Check all regularizations (including deleted ones if soft delete)
    const allRegs = await prisma.regularization.findMany({
        where: {
            workPackageId: wp.id
        },
        orderBy: { date: 'desc' }
    });

    console.log(`Total regularizations: ${allRegs.length}\n`);

    const manualByMonth = {};
    allRegs.filter(r => r.type === 'MANUAL_CONSUMPTION').forEach(r => {
        const d = new Date(r.date);
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        if (!manualByMonth[key]) manualByMonth[key] = [];
        manualByMonth[key].push(r);
    });

    console.log('Manual Consumptions by month:');
    Object.entries(manualByMonth).forEach(([month, regs]) => {
        console.log(`\n${month}:`);
        regs.forEach(r => {
            console.log(`  ${r.ticketId}: ${r.quantity}h - ${r.description} (reviewed: ${r.reviewedForDuplicates})`);
        });
    });

    await prisma.$disconnect();
}

checkDeletedRegs().catch(console.error);
