const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'IMP'; // Assuming IMPREX is IMP
    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId },
        select: {
            id: true,
            name: true,
            contractType: true,
            includeEvoTM: true,
            includeEvoEstimates: true
        }
    });

    console.log('Work Package Config:');
    console.log(JSON.stringify(wp, null, 2));

    if (!wp) {
        // Search by name if IMP is not correct
        const wps = await prisma.workPackage.findMany({
            where: { name: { contains: 'IMPREX' } }
        });
        console.log('Found WPs with IMPREX in name:', wps.map(w => ({ id: w.id, name: w.name })));
        return;
    }

    const ticket = await prisma.ticket.findFirst({
        where: {
            workPackageId: wp.id,
            issueKey: 'IMP-1218'
        }
    });

    console.log('\nTicket IMP-1218 Data:');
    console.log(JSON.stringify(ticket, null, 2));

    const allTicketsInMonth = await prisma.ticket.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 6
        }
    });
    console.log(`\nFound ${allTicketsInMonth.length} tickets in 06/2025`);
    allTicketsInMonth.forEach(t => {
        console.log(`- ${t.issueKey}: type=${t.issueType}, billing=${t.billingMode}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
