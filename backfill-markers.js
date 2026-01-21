const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    try {
        console.log('🚀 Starting backfill of Jira status markers...');

        // 1. Fix PRO Delivery markers on Ticket table
        const proTransitions = await prisma.ticketStatusHistory.findMany({
            where: {
                type: 'TICKET',
                status: { in: ['Entregado en PRD', 'ENTREGADO EN PRO', 'Entregado en PRO'], mode: 'insensitive' }
            },
            orderBy: { transitionDate: 'asc' }
        });

        console.log(`Found ${proTransitions.length} PRO transitions in history.`);
        for (const tr of proTransitions) {
            await prisma.ticket.updateMany({
                where: { issueKey: tr.issueKey, proDeliveryDate: null },
                data: { proDeliveryDate: tr.transitionDate }
            });
        }

        // 2. Fix Sent/Approved markers on EvolutivoProposal table
        const proposalTransitions = await prisma.ticketStatusHistory.findMany({
            where: { type: 'PROPOSAL' },
            orderBy: { transitionDate: 'asc' }
        });

        console.log(`Found ${proposalTransitions.length} proposal transitions in history.`);
        for (const tr of proposalTransitions) {
            const statusLower = tr.status.toLowerCase();
            if (statusLower === 'oferta enviada al gerente' || statusLower === 'enviado a gerente') {
                await prisma.evolutivoProposal.updateMany({
                    where: { issueKey: tr.issueKey, sentToGerenteDate: null },
                    data: { sentToGerenteDate: tr.transitionDate }
                });
            } else if (statusLower === 'oferta enviada al cliente' || statusLower === 'enviado a cliente') {
                await prisma.evolutivoProposal.updateMany({
                    where: { issueKey: tr.issueKey, sentToClientDate: null },
                    data: { sentToClientDate: tr.transitionDate }
                });
            } else if (statusLower === 'cerrado') {
                await prisma.evolutivoProposal.updateMany({
                    where: { issueKey: tr.issueKey, resolution: { equals: 'Aprobada', mode: 'insensitive' }, approvedDate: null },
                    data: { approvedDate: tr.transitionDate }
                });
            }
        }

        console.log('✅ Backfill completed successfully.');
    } catch (err) {
        console.error('❌ Error during backfill:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

backfill();
