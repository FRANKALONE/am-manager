import { backfillHistoryData } from '../app/actions/sync';
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';
dotenv.config();

async function runBackfill() {
    console.log("Starting backfill for AM Dashboard historical data...");
    try {
        let hasMore = true;
        let batchCount = 0;

        while (hasMore) {
            batchCount++;
            console.log(`\n--- Running Batch ${batchCount} ---`);
            const result = await backfillHistoryData();

            if (result.success) {
                console.log(`Batch ${batchCount} completed successfully.`);
                if (result.remaining) {
                    console.log(`Remaining: ${result.remaining.tickets} tickets, ${result.remaining.proposals} proposals`);
                }
                hasMore = result.hasMore;
            } else {
                console.error(`Error in batch ${batchCount}:`, result.error);
                hasMore = false;
            }

            // Limit to 5 batches for initial verification
            if (batchCount >= 5 && hasMore) {
                console.log("Stopping after 5 batches for safety.");
                hasMore = false;
            }
        }

        console.log("\nBackfill process finished.");
    } catch (error) {
        console.error("Critical error in backfill script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runBackfill();
