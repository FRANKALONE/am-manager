import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const start2024 = new Date('2024-01-01T00:00:00Z');
    const end2024 = new Date('2024-12-31T23:59:59Z');

    const countGlobal = await prisma.ticket.count({
        where: {
            createdDate: { gte: start2024, lte: end2024 },
            NOT: {
                issueType: { in: ['Evolutivo', 'Petición de Evolutivo', 'Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
            }
        }
    });

    console.log(`Global Tickets for 2024: ${countGlobal}`);

    const byType = await prisma.ticket.groupBy({
        by: ['issueType'],
        where: {
            createdDate: { gte: start2024, lte: end2024 },
            NOT: {
                issueType: { in: ['Evolutivo', 'Petición de Evolutivo', 'Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
            }
        },
        _count: true
    });

    console.log('Breakdown by type:');
    console.log(JSON.stringify(byType, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
