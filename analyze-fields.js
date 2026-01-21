const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    try {
        const evolutivos = await prisma.ticket.findMany({
            where: { issueType: 'Evolutivo' },
            select: { billingMode: true, originalEstimate: true, issueKey: true, status: true },
            take: 20
        });

        const proposals = await prisma.evolutivoProposal.findMany({
            select: { issueKey: true, status: true, resolution: true, createdDate: true, relatedTickets: true },
            take: 20
        });

        const peticiones = await prisma.ticket.findMany({
            where: { issueType: 'Petición de Evolutivo' },
            take: 20
        });

        const billingModes = await prisma.ticket.groupBy({
            by: ['billingMode'],
            where: { issueType: 'Evolutivo' },
            _count: true
        });

        const data = {
            evolutivos,
            proposals,
            peticiones,
            billingModes
        };

        fs.writeFileSync('detailed_analysis.json', JSON.stringify(data, null, 2));
        console.log('Results written to detailed_analysis.json');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
