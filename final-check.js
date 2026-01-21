const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    try {
        const ticketTypes = await prisma.ticket.groupBy({
            by: ['issueType'],
            _count: true
        });

        const statusCountsHistory = await prisma.ticketStatusHistory.groupBy({
            by: ['status'],
            _count: true
        });

        const proposalInternalStatuses = await prisma.evolutivoProposal.groupBy({
            by: ['status'],
            _count: true
        });

        const results = {
            ticketTypes,
            statusCountsHistory,
            proposalInternalStatuses
        };

        fs.writeFileSync('diagnostic_output.json', JSON.stringify(results, null, 2));
        console.log('Results written to diagnostic_output.json');
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
