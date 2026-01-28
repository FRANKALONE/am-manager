const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIssueTypes() {
    const year = 2025;
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    const tickets = await prisma.ticket.findMany({
        where: {
            createdDate: { gte: start, lte: end }
        },
        select: {
            issueType: true
        }
    });

    const counts = {};
    tickets.forEach(t => {
        counts[t.issueType] = (counts[t.issueType] || 0) + 1;
    });

    console.log('Issue Type counts in 2025:', counts);

    await prisma.$disconnect();
}

checkIssueTypes().catch(console.error);
