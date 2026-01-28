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
            year: true,
            createdDate: true
        }
    });

    console.log(`Total Peticiones in DB: ${peticiones.length}`);

    const count2025 = peticiones.filter(p => p.year === 2025).length;
    const countNullRes = peticiones.filter(p => p.resolution === null).length;
    const countClosedNullRes = peticiones.filter(p => p.resolution === null && p.status === 'Cerrado').length;

    console.log(`Peticiones in 2025: ${count2025}`);
    console.log(`Peticiones with null resolution: ${countNullRes}`);
    console.log(`Closed Peticiones with null resolution: ${countClosedNullRes}`);

    if (countClosedNullRes > 0) {
        console.log('Sample:', peticiones.filter(p => p.resolution === null && p.status === 'Cerrado').slice(0, 3));
    }

    await prisma.$disconnect();
}

checkPeticionesFull().catch(console.error);
