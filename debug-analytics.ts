
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugReport() {
    const year = 2025;
    const excludedClientName = "TRANSCOM";
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    const clients = await prisma.client.findMany({
        where: { name: { not: excludedClientName } },
        select: { id: true, name: true }
    });
    const clientIds = clients.map(c => c.id);

    const allSentTransitions = await prisma.ticketStatusHistory.findMany({
        where: {
            type: 'TICKET',
            status: {
                in: [
                    'Oferta enviada al cliente', 'Oferta enviada al gerente',
                    'Enviado a Cliente', 'Enviado a Gerente',
                    'Oferta Enviada', 'Enviado a SAP',
                    'En revisión', 'Pendiente aprobación'
                ],
                mode: 'insensitive'
            },
            transitionDate: { gte: start, lte: end }
        }
    });

    const testKey = 'ENP-608';
    const isInTransitions = allSentTransitions.some(t => t.issueKey === testKey);
    console.log(`Is ${testKey} in transitions? ${isInTransitions}`);

    const ticketDirect = await prisma.ticket.findFirst({
        where: { issueKey: testKey },
        include: { workPackage: { include: { client: true } } }
    });

    if (ticketDirect) {
        console.log(`Ticket ${testKey} found. Type: "${ticketDirect.issueType}". Client: "${ticketDirect.workPackage.client.name}"`);
        console.log(`Client ID: "${ticketDirect.workPackage.clientId}". Is in list? ${clientIds.includes(ticketDirect.workPackage.clientId)}`);
    } else {
        console.log(`Ticket ${testKey} NOT FOUND in Ticket table.`);
    }

    const keys = allSentTransitions.map(t => t.issueKey);

    const countNoFilter = await prisma.ticket.count({
        where: { issueKey: { in: keys }, workPackage: { clientId: { in: clientIds } } }
    });
    console.log(`Count without issueType filter: ${countNoFilter}`);

    const countWithTypeFilterValue1 = await prisma.ticket.count({
        where: {
            issueKey: { in: keys },
            workPackage: { clientId: { in: clientIds } },
            issueType: 'Petición de Evolutivo'
        }
    });
    console.log(`Count WITH issueType='Petición de Evolutivo': ${countWithTypeFilterValue1}`);

    const countWithTypeFilterValue2 = await prisma.ticket.count({
        where: {
            issueKey: { in: keys },
            workPackage: { clientId: { in: clientIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
        }
    });
    console.log(`Count WITH issueType='Petición de Evolutivo' (INSENSITIVE): ${countWithTypeFilterValue2}`);

    process.exit(0);
}

debugReport().catch(err => {
    console.error(err);
    process.exit(1);
});
