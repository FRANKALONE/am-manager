const dotenv = require('dotenv');
const path = require('path');

// Setup environment
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    console.log('--- Starting Backfill for 2025 Proposals ---');
    try {
        // Dynamically import ES modules
        const { prisma } = await import('../lib/prisma.js');
        const { syncTicketHistory } = await import('../app/actions/sync.js');

        const tickets = await prisma.ticket.findMany({
            where: {
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
                createdDate: { gte: new Date('2025-01-01') }
            },
            select: { issueKey: true },
            take: 50
        });

        console.log(`Found ${tickets.length} tickets to sync.`);

        for (let i = 0; i < tickets.length; i++) {
            const key = tickets[i].issueKey;
            process.stdout.write(`[${i + 1}/${tickets.length}] Syncing ${key}... `);
            try {
                await syncTicketHistory(key, 'TICKET');
                console.log('DONE');
            } catch (err) {
                console.log('ERROR: ' + (err.message || err));
            }
        }

        console.log('--- Backfill Batch Complete ---');

    } catch (error) {
        console.error('Error during backfill:', error);
    }
}

main();
