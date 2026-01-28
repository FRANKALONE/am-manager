const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreatedDateBoth() {
    const year = 2025;
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    const peticiones = await prisma.ticket.count({
        where: {
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    const evolutivos = await prisma.ticket.count({
        where: {
            issueType: { equals: 'Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    console.log(`Created in 2025:`);
    console.log(`- Petición de Evolutivo: ${peticiones}`);
    console.log(`- Evolutivo: ${evolutivos}`);

    await prisma.$disconnect();
}

checkCreatedDateBoth().catch(console.error);
