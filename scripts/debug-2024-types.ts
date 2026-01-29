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
    console.log(JSON.stringify(types, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
