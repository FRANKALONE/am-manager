const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkYearField() {
    const counts = await prisma.ticket.groupBy({
        by: ['issueType'],
        _count: { _all: true },
        where: { year: 2025 }
    });

    for (const c of counts) {
        console.log(`${c.issueType}: ${c._count._all}`);
    }

    await prisma.$disconnect();
}

checkYearField().catch(console.error);
