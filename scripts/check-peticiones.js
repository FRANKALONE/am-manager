const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPeticionesDetailed() {
    const year = 2025;
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    const peticiones = await prisma.ticket.findMany({
        where: {
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        },
        select: {
            issueKey: true,
            status: true,
            resolution: true
        }
    });

    console.log(`Peticiones in 2025: ${peticiones.length}`);

    const resolutions = {};
    const statuses = {};

    peticiones.forEach(p => {
        resolutions[p.resolution] = (resolutions[p.resolution] || 0) + 1;
        statuses[p.status] = (statuses[p.status] || 0) + 1;
    });

    console.log('Resolutions:', resolutions);
    console.log('Statuses:', statuses);

    await prisma.$disconnect();
}

checkPeticionesDetailed().catch(console.error);
