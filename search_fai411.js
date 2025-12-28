// Script to search for tickets similar to FAI-411
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchSimilarTickets() {
    console.log('=== Searching for tickets similar to FAI-411 ===\n');

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

    // Search for worklogs with issue keys containing "411"
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            issueKey: { contains: '411' }
        }
    });

    console.log(`Worklogs containing "411": ${worklogs.length}`);
    worklogs.forEach(w => {
        console.log(`  ${w.issueKey}: ${w.month}/${w.year} - ${w.timeSpentHours}h (${w.issueType})`);
    });

    // Search for worklogs in September 2025
    const septWorklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 9
        }
    });

    console.log(`\nWorklogs in September 2025: ${septWorklogs.length}`);
    const septByTicket = {};
    septWorklogs.forEach(w => {
        if (!septByTicket[w.issueKey]) septByTicket[w.issueKey] = 0;
        septByTicket[w.issueKey] += w.timeSpentHours;
    });

    Object.entries(septByTicket).forEach(([key, hours]) => {
        console.log(`  ${key}: ${hours.toFixed(2)}h`);
    });

    // Search for manual consumptions in September
    const septRegs = await prisma.regularization.findMany({
        where: {
            workPackageId: wp.id,
            type: 'MANUAL_CONSUMPTION'
        }
    });

    const septManual = septRegs.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === 2025 && d.getMonth() + 1 === 9;
    });

    console.log(`\nManual consumptions in September 2025: ${septManual.length}`);
    septManual.forEach(r => {
        console.log(`  ${r.ticketId}: ${r.quantity}h - ${r.description}`);
    });

    await prisma.$disconnect();
}

searchSimilarTickets().catch(console.error);
