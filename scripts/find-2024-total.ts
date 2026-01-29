import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-12-31T23:59:59Z');

    // Count ALL tickets in 2024
    const allCount = await prisma.ticket.count({
        where: { createdDate: { gte: start, lte: end } }
    });
    console.log('Total 2024 tickets (brute):', allCount);

    // Group by issueType to see what's there
    const types = await prisma.ticket.groupBy({
        by: ['issueType'],
        where: { createdDate: { gte: start, lte: end } },
        _count: true
    });
    console.log('Types in 2024:', JSON.stringify(types, null, 2));

    // Check if year field is used differently
    const year2024Field = await prisma.ticket.count({ where: { year: 2024 } });
    console.log('Tickets with year=2024 field:', year2024Field);
}

main().catch(console.error).finally(() => prisma.$disconnect());
