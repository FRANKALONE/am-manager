const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkYearField() {
    const counts = await prisma.ticket.groupBy({
        by: ['issueType'],
        _count: { _all: true },
        where: { year: 2025 }
    });

    console.log(JSON.stringify(counts, null, 2));

    await prisma.$disconnect();
}

checkYearField().catch(console.error);
