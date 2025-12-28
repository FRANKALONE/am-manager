// Script to search for all tickets starting with FAI-4
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchFAI4Tickets() {
    console.log('=== Searching for tickets starting with FAI-4 ===\n');

    // Search in all WPs
    const allWorklogs = await prisma.worklogDetail.findMany({
        where: {
            issueKey: { startsWith: 'FAI-4' }
        },
        distinct: ['issueKey'],
        select: {
            issueKey: true,
            issueType: true,
            workPackageId: true
        }
    });

    console.log(`Found ${allWorklogs.length} unique tickets starting with FAI-4:\n`);
    allWorklogs.forEach(w => {
        console.log(`  ${w.issueKey} (${w.issueType}) in WP: ${w.workPackageId}`);
    });

    // Search for manual consumptions
    const manualRegs = await prisma.regularization.findMany({
        where: {
            ticketId: { startsWith: 'FAI-4' }
        }
    });

    console.log(`\nManual consumptions with FAI-4: ${manualRegs.length}`);
    manualRegs.forEach(r => {
        const d = new Date(r.date);
        console.log(`  ${r.ticketId}: ${r.quantity}h in ${d.getMonth() + 1}/${d.getFullYear()}`);
    });

    await prisma.$disconnect();
}

searchFAI4Tickets().catch(console.error);
