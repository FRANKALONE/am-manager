import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncTicketHistory } from '@/app/actions/sync';

/**
 * Vercel Cron Job: Automatic History Sync
 * Runs every minute to process batches until completion
 */
export async function GET(request: NextRequest) {
    // Verify this is a cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BATCH_SIZE_TICKETS = 500;
    const BATCH_SIZE_PROPOSALS = 250;

    try {
        console.log('[CRON] Starting history sync batch...');

        // Check if there are unsynced tickets
        const unsyncedTickets = await (prisma as any).ticket.findMany({
            select: { issueKey: true },
            where: { proDeliveryDate: null },
            take: BATCH_SIZE_TICKETS,
            orderBy: { createdDate: 'desc' }
        });

        // Check if there are unsynced proposals
        const unsyncedProposals = await (prisma as any).evolutivoProposal.findMany({
            select: { issueKey: true },
            where: {
                AND: [
                    { sentToGerenteDate: null },
                    { sentToClientDate: null },
                    { approvedDate: null }
                ]
            },
            take: BATCH_SIZE_PROPOSALS,
            orderBy: { createdDate: 'desc' }
        });

        // If nothing to sync, we're done
        if (unsyncedTickets.length === 0 && unsyncedProposals.length === 0) {
            console.log('[CRON] No more records to sync. Job complete.');
            return NextResponse.json({
                status: 'completed',
                message: 'All records synced'
            });
        }

        // Process tickets
        let ticketErrors = 0;
        for (const ticket of unsyncedTickets) {
            try {
                await syncTicketHistory(ticket.issueKey, 'TICKET');
            } catch (err) {
                ticketErrors++;
                console.error(`[CRON] Error syncing ticket ${ticket.issueKey}:`, err);
            }
        }

        // Process proposals
        let proposalErrors = 0;
        for (const proposal of unsyncedProposals) {
            try {
                await syncTicketHistory(proposal.issueKey, 'PROPOSAL');
            } catch (err) {
                proposalErrors++;
                console.error(`[CRON] Error syncing proposal ${proposal.issueKey}:`, err);
            }
        }

        const processed = {
            tickets: unsyncedTickets.length - ticketErrors,
            proposals: unsyncedProposals.length - proposalErrors
        };

        console.log(`[CRON] Batch complete: ${processed.tickets} tickets, ${processed.proposals} proposals`);

        return NextResponse.json({
            status: 'processing',
            processed,
            hasMore: unsyncedTickets.length === BATCH_SIZE_TICKETS ||
                unsyncedProposals.length === BATCH_SIZE_PROPOSALS
        });

    } catch (error: any) {
        console.error('[CRON] Critical error:', error);
        return NextResponse.json({
            error: error.message,
            status: 'error'
        }, { status: 500 });
    }
}
