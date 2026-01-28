const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkResolutions() {
    console.log('--- START DIAGNOSTIC ---');

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

    console.log(`Total Peticiones in ${year}: ${peticiones.length}`);

    const resolutionCounts = {};
    const statusCounts = {};

    peticiones.forEach(p => {
        const res = p.resolution || 'NULL';
        resolutionCounts[res] = (resolutionCounts[res] || 0) + 1;

        const st = p.status || 'NULL';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    console.log('Resolution counts:', resolutionCounts);
    console.log('Status counts:', statusCounts);

    const approved = peticiones.filter(p =>
        (p.resolution && (p.resolution.toLowerCase() === 'aprobada' || p.resolution.toLowerCase() === 'aprobado')) &&
        (p.status && (p.status.toLowerCase() === 'cerrado' || p.status.toLowerCase() === 'resuelto' || p.status.toLowerCase() === 'done'))
    );

    console.log(`Approved Peticiones: ${approved.length}`);

    // Check sent transitions
    const sentTransitions = await prisma.ticketStatusHistory.findMany({
        where: {
            status: {
                in: [
                    'Oferta Generada',
                    'Oferta enviada al cliente',
                    'Oferta enviada al gerente'
                ],
                mode: 'insensitive'
            },
            transitionDate: { gte: start, lte: end }
        }
    });

    console.log(`Sent transitions: ${sentTransitions.length}`);

    const uniqueKeys = new Set(sentTransitions.map(t => t.issueKey));

    const ticketsForTransitions = await prisma.ticket.findMany({
        where: { issueKey: { in: Array.from(uniqueKeys) } },
        select: { issueKey: true, issueType: true }
    });

    const sentPeticiones = ticketsForTransitions.filter(t => t.issueType.toLowerCase() === 'petición de evolutivo');
    console.log(`Sent Peticiones (unique): ${sentPeticiones.length}`);

    console.log('--- END DIAGNOSTIC ---');
    await prisma.$disconnect();
}

checkResolutions().catch(console.error);
