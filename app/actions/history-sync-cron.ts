"use server";

import { prisma } from "@/lib/prisma";
import { syncTicketHistory } from "./sync";
import { getHistorySyncStatus, setHistorySyncStatus, HistorySyncJobStatus } from "./history-sync-jobs";

export async function startHistorySync() {
    try {
        // Get all unsynced tickets and proposals
        const unsyncedTickets = await (prisma as any).ticket.findMany({
            select: { issueKey: true },
            where: { proDeliveryDate: null },
            orderBy: { createdDate: 'desc' }
        });

        const unsyncedProposals = await (prisma as any).evolutivoProposal.findMany({
            select: { issueKey: true },
            where: {
                AND: [
                    { sentToGerenteDate: null },
                    { sentToClientDate: null },
                    { approvedDate: null }
                ]
            },
            orderBy: { createdDate: 'desc' }
        });

        const totalRecords = unsyncedTickets.length + unsyncedProposals.length;

        if (totalRecords === 0) {
            return { error: "No records to sync" };
        }

        // Combine into single array with type info
        const allRecords = [
            ...unsyncedTickets.map((t: any) => ({ key: t.issueKey, type: 'TICKET' as const })),
            ...unsyncedProposals.map((p: any) => ({ key: p.issueKey, type: 'PROPOSAL' as const }))
        ];

        const startTime = Date.now();
        const initialStatus: HistorySyncJobStatus = {
            isSyncing: true,
            progress: 0,
            currentIdx: 0,
            totalRecords: allRecords.length,
            currentType: 'TICKET',
            currentKey: "",
            startTime,
            results: { success: 0, errors: 0 },
            lastUpdate: startTime
        };

        await setHistorySyncStatus(initialStatus);

        return { success: true, totalRecords: allRecords.length };
    } catch (error: any) {
        console.error("Error in startHistorySync:", error);
        return { error: error.message };
    }
}

export async function processNextHistoryBatch() {
    try {
        const currentStatus = await getHistorySyncStatus();
        if (!currentStatus || !currentStatus.isSyncing) return { finished: true };

        // Get all records again (in case some were synced externally)
        const unsyncedTickets = await (prisma as any).ticket.findMany({
            select: { issueKey: true },
            where: { proDeliveryDate: null },
            orderBy: { createdDate: 'desc' }
        });

        const unsyncedProposals = await (prisma as any).evolutivoProposal.findMany({
            select: { issueKey: true },
            where: {
                AND: [
                    { sentToGerenteDate: null },
                    { sentToClientDate: null },
                    { approvedDate: null }
                ]
            },
            orderBy: { createdDate: 'desc' }
        });

        const allRecords = [
            ...unsyncedTickets.map((t: any) => ({ key: t.issueKey, type: 'TICKET' as const })),
            ...unsyncedProposals.map((p: any) => ({ key: p.issueKey, type: 'PROPOSAL' as const }))
        ];

        if (allRecords.length === 0) {
            // All done!
            await setHistorySyncStatus({ ...currentStatus, isSyncing: false, progress: 100 });

            await prisma.importLog.create({
                data: {
                    type: 'MANUAL_SYNC',
                    status: 'SUCCESS',
                    filename: `history_sync_complete_${new Date().toISOString().split('T')[0]}`,
                    totalRows: currentStatus.results.success + currentStatus.results.errors,
                    processedCount: currentStatus.results.success,
                    errors: JSON.stringify({
                        success: currentStatus.results.success,
                        errors: currentStatus.results.errors,
                        executionTime: Date.now() - (currentStatus.startTime || Date.now())
                    }),
                    date: new Date()
                }
            });

            return { finished: true };
        }

        // Process first record
        const record = allRecords[0];

        // Update status STARTING
        await setHistorySyncStatus({
            ...currentStatus,
            currentKey: record.key,
            currentType: record.type,
            lastUpdate: Date.now()
        });

        // Sync the record
        let success = false;
        try {
            await syncTicketHistory(record.key, record.type);
            success = true;
        } catch (err: any) {
            console.error(`[HISTORY_SYNC] Error syncing ${record.type} ${record.key}:`, err);
        }

        // Update results
        const updatedStatus = await getHistorySyncStatus();
        if (updatedStatus && updatedStatus.isSyncing) {
            const nextResults = { ...updatedStatus.results };
            if (success) {
                nextResults.success++;
            } else {
                nextResults.errors++;
            }

            const totalProcessed = nextResults.success + nextResults.errors;
            const nextStepStatus: HistorySyncJobStatus = {
                ...updatedStatus,
                currentIdx: totalProcessed,
                progress: (totalProcessed / currentStatus.totalRecords) * 100,
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
