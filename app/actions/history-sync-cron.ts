"use server";

import { prisma } from "@/lib/prisma";
import { syncHistoryInBulk } from "./sync";
import { getHistorySyncStatus, setHistorySyncStatus, HistorySyncJobStatus } from "./history-sync-jobs";

export async function startHistorySync() {
    try {
        // Count all Evolutivo tickets and ALL proposals
        const totalTickets = await (prisma as any).ticket.count({
            where: { issueType: 'Evolutivo' }
        });

        const totalProposals = await (prisma as any).evolutivoProposal.count();

        const totalRecords = totalTickets + totalProposals;

        if (totalRecords === 0) {
            return { error: "No hay registros para sincronizar." };
        }

        const startTime = Date.now();
        const initialStatus: HistorySyncJobStatus = {
            isSyncing: true,
            progress: 0,
            currentIdx: 0,
            totalRecords: totalRecords,
            currentType: 'TICKET',
            currentKey: "",
            startTime,
            results: { success: 0, errors: 0 },
            lastUpdate: startTime
        };

        await setHistorySyncStatus(initialStatus);

        return { success: true, totalRecords: totalRecords };
    } catch (error: any) {
        console.error("Error in startHistorySync:", error);
        return { error: error.message };
    }
}

export async function processNextHistoryBatch() {
    try {
        const currentStatus = await getHistorySyncStatus();
        if (!currentStatus || !currentStatus.isSyncing || currentStatus.stopped) {
            return { finished: true };
        }

        const BATCH_SIZE = 50;

        // Get total counts to handle pagination between tables
        const totalTickets = await (prisma as any).ticket.count({
            where: { issueType: 'Evolutivo' }
        });

        let allRecords: { key: string, type: 'TICKET' | 'PROPOSAL' }[] = [];

        if (currentStatus.currentIdx < totalTickets) {
            // Processing TICKETS
            const tickets = await (prisma as any).ticket.findMany({
                select: { issueKey: true },
                where: { issueType: 'Evolutivo' },
                orderBy: { id: 'asc' },
                skip: currentStatus.currentIdx,
                take: BATCH_SIZE
            });
            allRecords = tickets.map((t: any) => ({ key: t.issueKey, type: 'TICKET' as const }));
        } else {
            // Processing PROPOSALS
            const proposalSkip = currentStatus.currentIdx - totalTickets;
            const proposals = await (prisma as any).evolutivoProposal.findMany({
                select: { issueKey: true },
                orderBy: { id: 'asc' },
                skip: proposalSkip,
                take: BATCH_SIZE
            });
            allRecords = proposals.map((p: any) => ({ key: p.issueKey, type: 'PROPOSAL' as const }));
        }

        if (allRecords.length === 0) {
            // All done! Update status and log
            await setHistorySyncStatus({
                ...currentStatus,
                isSyncing: false,
                progress: 100,
                currentIdx: currentStatus.totalRecords
            });

            // Re-add the ImportLog entry
            try {
                await prisma.importLog.create({
                    data: {
                        type: 'MANUAL_SYNC',
                        status: 'SUCCESS',
                        filename: `history_sync_complete_${new Date().toISOString().split('T')[0]}`,
                        totalRows: currentStatus.totalRecords,
                        processedCount: currentStatus.results.success,
                        errors: JSON.stringify({
                            success: currentStatus.results.success,
                            errors: currentStatus.results.errors,
                            executionTime: Date.now() - (currentStatus.startTime || Date.now())
                        }),
                        date: new Date()
                    }
                });
            } catch (logErr) {
                console.error("Failed to create import log:", logErr);
            }

            return { finished: true };
        }

        // Update status for the batch we are about to process
        await setHistorySyncStatus({
            ...currentStatus,
            currentKey: `${allRecords[0].key}${allRecords.length > 1 ? ` ... ${allRecords[allRecords.length - 1].key}` : ''}`,
            currentType: allRecords[0].type,
            lastUpdate: Date.now()
        });

        // Sync the batch using the bulk helper in sync.ts
        let successCount = 0;
        let errorCount = 0;
        try {
            await syncHistoryInBulk(allRecords.map(r => r.key), allRecords[0].type);
            successCount = allRecords.length;
        } catch (err: any) {
            console.error(`[HISTORY_SYNC] Bulk error for ${allRecords[0].type} batch:`, err);
            errorCount = allRecords.length;
        }

        // Update results and progress
        const updatedStatus = await getHistorySyncStatus();
        if (updatedStatus && updatedStatus.isSyncing) {
            const nextResults = {
                success: updatedStatus.results.success + successCount,
                errors: updatedStatus.results.errors + errorCount
            };

            const totalProcessedSoFar = updatedStatus.currentIdx + allRecords.length;
            const progress = Math.min(100, (totalProcessedSoFar / updatedStatus.totalRecords) * 100);

            const nextStepStatus: HistorySyncJobStatus = {
                ...updatedStatus,
                currentIdx: totalProcessedSoFar,
                progress,
                results: nextResults,
                lastUpdate: Date.now()
            };

            await setHistorySyncStatus(nextStepStatus);
            return { finished: false, status: nextStepStatus };
        }

        return { finished: true };
    } catch (error: any) {
        console.error("Error in processNextHistoryBatch:", error);
        return { error: error.message };
    }
}
