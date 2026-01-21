"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const HISTORY_SYNC_JOB_KEY = "HISTORY_SYNC_STATUS";

export type HistorySyncJobStatus = {
    isSyncing: boolean;
    progress: number;
    currentIdx: number;
    totalRecords: number;
    currentType: 'TICKET' | 'PROPOSAL';
    currentKey: string;
    startTime: number | null;
    results: { success: number; errors: number };
    lastUpdate: number;
    stopped?: boolean;
};

export async function getHistorySyncStatus(): Promise<HistorySyncJobStatus | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: HISTORY_SYNC_JOB_KEY }
        });

        if (!setting) return null;
        return JSON.parse(setting.value);
    } catch (error) {
        console.error("Error getting history sync status:", error);
        return null;
    }
}

export async function setHistorySyncStatus(status: HistorySyncJobStatus | null) {
    try {
        if (status === null) {
            await prisma.systemSetting.deleteMany({
                where: { key: HISTORY_SYNC_JOB_KEY }
            });
        } else {
            await prisma.systemSetting.upsert({
                where: { key: HISTORY_SYNC_JOB_KEY },
                update: {
                    value: JSON.stringify(status),
                    description: "Status of the ongoing history sync job"
                },
                create: {
                    key: HISTORY_SYNC_JOB_KEY,
                    value: JSON.stringify(status),
                    description: "Status of the ongoing history sync job",
                    group: "SYSTEM"
                }
            });
        }
        revalidatePath("/admin/import");
    } catch (error) {
        console.error("Error setting history sync status:", error);
    }
}

export async function stopHistorySync() {
    try {
        const status = await getHistorySyncStatus();
        if (status && status.isSyncing) {
            console.log(`[HISTORY_SYNC_CANCEL] User cancelled sync at record ${status.currentIdx}/${status.totalRecords}`);

            await setHistorySyncStatus({
                ...status,
                isSyncing: false,
                stopped: true,
                lastUpdate: Date.now()
            });

            await prisma.importLog.create({
                data: {
                    type: 'MANUAL_SYNC',
                    status: 'ERROR',
                    filename: `history_sync_CANCELLED_${new Date().toISOString().split('T')[0]}`,
                    totalRows: status.totalRecords,
                    processedCount: status.results.success,
                    errors: JSON.stringify({
                        cancelled: true,
                        cancelledAt: status.currentIdx,
                        totalProcessed: status.currentIdx,
                        success: status.results.success,
                        errors: status.results.errors,
                        executionTime: Date.now() - (status.startTime || Date.now())
                    }),
                    date: new Date()
                }
            });
        }
    } catch (error) {
        console.error("Error stopping history sync:", error);
    }
}
