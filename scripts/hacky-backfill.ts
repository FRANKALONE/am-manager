import { prisma } from '../lib/prisma';
import { syncTicketHistory } from '../app/actions/sync';
import * as dotenv from 'dotenv';
dotenv.config();

async function hackyBackfill() {
    console.log("Starting hacky backfill for 2025 Petición de Evolutivo tickets...");
    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
                createdDate: { gte: new Date('2025-01-01') }
            },
            select: { issueKey: true },
            take: 100 // Process a small batch first
        });

        console.log(`Found ${tickets.length} tickets to process.`);

        for (let i = 0; i < tickets.length; i++) {
            const key = tickets[i].issueKey;
            try {
                process.stdout.write(`[${i + 1}/${tickets.length}] Syncing ${key}... `);
                await syncTicketHistory(key, 'TICKET');
                console.log("OK");
            } catch (err) {
                console.log("ERROR: " + err.message);
            }
        }

        console.log("Batch complete.");
    } catch (e) {
        console.error("Critical error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

hackyBackfill();
