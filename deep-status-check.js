const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    try {
        // 1. All unique statuses in history for TICKET type in 2025
        const ticketStatuses = await prisma.ticketStatusHistory.groupBy({
            by: ['status'],
            where: {
                type: 'TICKET',
                transitionDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            },
            _count: true
        });

        // 2. Current status distribution of Evolutivos created in 2025
        const currentStatusEvolutivos2025 = await prisma.ticket.groupBy({
            by: ['status'],
            where: {
                issueType: 'Evolutivo',
                createdDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            },
            _count: true
        });

        // 3. Current status distribution of Peticiones created in 2025
        const currentStatusPeticiones2025 = await prisma.ticket.groupBy({
            by: ['status'],
            where: {
                issueType: 'Petición de Evolutivo',
                createdDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                }
            },
            _count: true
        });

        const results = {
            historyStatuses2025: ticketStatuses,
            currentStatusEvolutivos2025,
            currentStatusPeticiones2025
        };

        fs.writeFileSync('status_analysis_v2.json', JSON.stringify(results, null, 2));
        console.log('Results written to status_analysis_v2.json');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
