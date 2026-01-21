"use server";

import { prisma } from "@/lib/prisma";
import { syncTicketHistory } from "./sync";
import { getHistorySyncStatus, setHistorySyncStatus, HistorySyncJobStatus } from "./history-sync-jobs";

export async function startHistorySync() {
    try {
        // Get all unsynced tickets and proposals (ONLY Evolutivos for tickets)
        const unsyncedTickets = await (prisma as any).ticket.findMany({
            select: { issueKey: true },
            where: {
                proDeliveryDate: null,
                issueType: 'Evolutivo'
            },
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
            return { error: "No hay registros pendientes de sincronización (Evolutivos)." };
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
        if (!currentStatus || !currentStatus.isSyncing || currentStatus.stopped) {
            return { finished: true };
        }

        const BATCH_SIZE = 50;

        // Get next batch of unsynced records
        const unsyncedTickets = await (prisma as any).ticket.findMany({
            select: { issueKey: true },
            where: {
                proDeliveryDate: null,
                issueType: 'Evolutivo'
            },
            orderBy: { createdDate: 'desc' },
            take: BATCH_SIZE
        });

        let allRecords: { key: string, type: 'TICKET' | 'PROPOSAL' }[] = [];

        if (unsyncedTickets.length > 0) {
            allRecords = unsyncedTickets.map((t: any) => ({ key: t.issueKey, type: 'TICKET' as const }));
        } else {
            // If no tickets, try proposals
            const unsyncedProposals = await (prisma as any).evolutivoProposal.findMany({
                select: { issueKey: true },
                where: {
                    AND: [
                        { sentToGerenteDate: null },
                        { sentToClientDate: null },
                        { approvedDate: null }
                    ]
                },
                orderBy: { createdDate: 'desc' },
                take: BATCH_SIZE
            });
            allRecords = unsyncedProposals.map((p: any) => ({ key: p.issueKey, type: 'PROPOSAL' as const }));
        }

        if (allRecords.length === 0) {
            // All done!
            await setHistorySyncStatus({ ...currentStatus, isSyncing: false, progress: 100 });
            return { finished: true };
        }

        // Update status for current batch
        await setHistorySyncStatus({
            ...currentStatus,
            currentKey: `${allRecords[0].key} ... ${allRecords[allRecords.length - 1].key}`,
            currentType: allRecords[0].type,
            lastUpdate: Date.now()
        });

        // Sync the batch using the bulk helper
        const { syncHistoryInBulk } = require("./sync");
        await syncHistoryInBulk(allRecords.map(r => r.key), allRecords[0].type);

        // Update results
        const updatedStatus = await getHistorySyncStatus();
        if (updatedStatus && updatedStatus.isSyncing) {
            const nextResults = { ...updatedStatus.results };
            nextResults.success += allRecords.length;

            const totalProcessed = updatedStatus.currentIdx + allRecords.length;
            const nextStepStatus: HistorySyncJobStatus = {
                ...updatedStatus,
                currentIdx: totalProcessed,
                progress: (totalProcessed / updatedStatus.totalRecords) * 100,
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
