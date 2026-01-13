
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUnknowns() {
    try {
        const unknowns = await prisma.ticket.findMany({
            where: {
                reporter: 'Unknown'
            },
            select: {
                issueKey: true,
                workPackageId: true,
                issueType: true,
                createdDate: true,
                year: true,
                month: true
            },
            orderBy: {
                createdDate: 'desc'
            },
            take: 20
        });

        console.log("Top 20 Unknown Reporter Tickets:");
        console.table(unknowns);

        const countByWP = await prisma.ticket.groupBy({
            where: { reporter: 'Unknown' },
            by: ['workPackageId'],
            _count: { issueKey: true },
            orderBy: { _count: { issueKey: 'desc' } }
        });

        console.log("\nUnknowns by Work Package:");
        console.table(countByWP);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

findUnknowns();
