const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const ticketTypes = await prisma.ticket.groupBy({
            by: ['issueType'],
            _count: true
        });

        const proposalStatuses = await prisma.evolutivoProposal.groupBy({
            by: ['status'],
            _count: true
        });

        const sampleTicketHistory = await prisma.ticketStatusHistory.findMany({
            where: { status: 'ENTREGADO EN PRO' },
            take: 5
        });

        const sampleProposalHistory = await prisma.ticketStatusHistory.findMany({
            where: { type: 'PROPOSAL' },
            take: 10
        });

        console.log('--- DATA DETAILS ---');
        console.log('Ticket Types:', JSON.stringify(ticketTypes, null, 2));
        console.log('Proposal Internal Statuses:', JSON.stringify(proposalStatuses, null, 2));
        console.log('Sample Ticket History:', JSON.stringify(sampleTicketHistory, null, 2));
        console.log('Sample Proposal History:', JSON.stringify(sampleProposalHistory, null, 2));
        console.log('--------------------');
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
