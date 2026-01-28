const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateInconsistency() {
    const tickets = await prisma.ticket.findMany({
        where: {
            year: 2025,
            issueType: 'Evolutivo'
        },
        select: {
            issueKey: true,
            createdDate: true,
            year: true
        },
        take: 20
    });

    console.log('Sample Evolutivo tickets for year 2025:');
    tickets.forEach(t => {
        console.log(`${t.issueKey}: createdDate=${t.createdDate.toISOString()}, year=${t.year}`);
    });

    await prisma.$disconnect();
}

checkDateInconsistency().catch(console.error);
