const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPeticionesFull() {
    const peticiones = await prisma.ticket.findMany({
        where: {
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
        },
        select: {
            issueKey: true,
            status: true,
            resolution: true,
            year: true
        }
    });

    const countAll = peticiones.length;
    const count2025 = peticiones.filter(p => p.year === 2025).length;
    const countNullRes = peticiones.filter(p => p.resolution === null).length;
    const countClosedNullRes = peticiones.filter(p => p.resolution === null && p.status === 'Cerrado').length;

    console.log(`ALL: ${countAll}`);
    console.log(`2025: ${count2025}`);
    console.log(`NULL_RES: ${countNullRes}`);
    console.log(`CLOSED_NULL_RES: ${countClosedNullRes}`);

    await prisma.$disconnect();
}

checkPeticionesFull().catch(console.error);
