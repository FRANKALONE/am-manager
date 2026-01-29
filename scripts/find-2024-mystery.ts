import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-12-31T23:59:59Z');

    // 1. Tickets created in 2024
    const ticketsCount = await prisma.ticket.count({
        where: { createdDate: { gte: start, lte: end } }
    });
    console.log('Tickets with createdDate in 2024:', ticketsCount);

    // 2. Unique issues in WorklogDetail for 2024
    const worklogIssues = await prisma.worklogDetail.groupBy({
        by: ['issueKey'],
        where: { startDate: { gte: start, lte: end } }
    });
    console.log('Unique issueKeys in WorklogDetail for 2024:', worklogIssues.length);

    // 3. Group by issueType for ALL tickets in 2024 again (to be 100% sure)
    const types = await prisma.ticket.groupBy({
        by: ['issueType'],
        where: { createdDate: { gte: start, lte: end } },
        _count: true
    });
    console.log('Issue Type distribution 2024:', JSON.stringify(types, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
