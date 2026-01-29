import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-12-31T23:59:59Z');

    const types = await prisma.ticket.groupBy({
        by: ['issueType'],
        where: { createdDate: { gte: start, lte: end } },
        _count: true
    });

    console.log('--- 2024 TICKET TYPES ---');
    types.forEach(t => {
        console.log(`${t.issueType}: ${t._count}`);
    });

    const total = types.reduce((sum, t) => sum + t._count, 0);
    console.log('--- TOTAL: ' + total);

    // Check unique issue keys
    const keys = await prisma.ticket.findMany({
        where: { createdDate: { gte: start, lte: end } },
        select: { issueKey: true }
    });
    const uniqueKeys = new Set(keys.map(k => k.issueKey)).size;
    console.log('Unique Issue Keys: ' + uniqueKeys);
}

main().catch(console.error).finally(() => prisma.$disconnect());
