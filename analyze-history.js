const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const statusCounts = await prisma.ticketStatusHistory.groupBy({
            by: ['status'],
            _count: true
        });

        const dateRange = await prisma.ticketStatusHistory.aggregate({
            _min: { transitionDate: true },
            _max: { transitionDate: true }
        });

        const transitions2025 = await prisma.ticketStatusHistory.count({
            where: {
                transitionDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            }
        });

        const entregasPro2025 = await prisma.ticketStatusHistory.count({
            where: {
                status: 'ENTREGADO EN PRO',
                transitionDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            }
        });

        const enviadas2025 = await prisma.ticketStatusHistory.count({
            where: {
                status: { in: ['Enviado a Gerente', 'Enviado a Cliente'] },
                transitionDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            }
        });

        console.log('--- STATUS ANALYSIS ---');
        console.log('Status Counts:', JSON.stringify(statusCounts, null, 2));
        console.log('Min Date:', dateRange._min.transitionDate);
        console.log('Max Date:', dateRange._max.transitionDate);
        console.log('Total Transitions 2025:', transitions2025);
        console.log('Entregados PRO 2025:', entregasPro2025);
        console.log('Enviadas 2025:', enviadas2025);
        console.log('-----------------------');
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
