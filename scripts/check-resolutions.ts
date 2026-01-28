import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkResolutions() {
    console.log('Checking ticket resolutions and statuses for "Petición de Evolutivo"...');

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

    console.log(`Total Peticiones created in ${year}: ${peticiones.length}`);

    const resolutionCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    peticiones.forEach(p => {
        const res = p.resolution || 'NULL';
        resolutionCounts[res] = (resolutionCounts[res] || 0) + 1;

        const st = p.status || 'NULL';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    console.log('\nResolution counts:');
    console.log(JSON.stringify(resolutionCounts, null, 2));

    console.log('\nStatus counts:');
    console.log(JSON.stringify(statusCounts, null, 2));

    const approved = peticiones.filter(p =>
        (p.resolution?.toLowerCase() === 'aprobada' || p.resolution?.toLowerCase() === 'aprobado') &&
        (p.status?.toLowerCase() === 'cerrado' || p.status?.toLowerCase() === 'resuelto' || p.status?.toLowerCase() === 'done')
    );

    console.log(`\nApproved Peticiones (Flexible filter): ${approved.length}`);
    if (approved.length > 0) {
        console.log('Sample approved:', approved.slice(0, 3));
    }

    // Check history for "Enviadas"
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

    console.log(`\nTotal "Sent" transitions in ${year}: ${sentTransitions.length}`);

    const uniqueKeysInTransitions = new Set(sentTransitions.map(t => t.issueKey));
    console.log(`Unique issue keys in transitions: ${uniqueKeysInTransitions.size}`);

    const ticketsForTransitions = await prisma.ticket.findMany({
        where: {
            issueKey: { in: Array.from(uniqueKeysInTransitions) }
        },
        select: {
            issueKey: true,
            issueType: true
        }
    });

    const sentPeticiones = ticketsForTransitions.filter(t => t.issueType.toLowerCase() === 'petición de evolutivo');
    console.log(`Unique "Petición de Evolutivo" tickets with sent transitions: ${sentPeticiones.length}`);

    await prisma.$disconnect();
}

checkResolutions().catch(console.error);
