"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SYNC_JOB_KEY = "BULK_SYNC_STATUS";

export type SyncJobStatus = {
    isSyncing: boolean;
    progress: number;
    currentIdx: number;
    totalWps: number;
    currentWpName: string;
    startTime: number | null;
    results: { success: number; errors: number };
    syncDays: number | null; // null means full sync
    lastUpdate: number;
    stopped?: boolean;
};

export async function getBulkSyncStatus(): Promise<SyncJobStatus | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SYNC_JOB_KEY }
        });

        if (!setting) return null;
        return JSON.parse(setting.value);
    } catch (error) {
        console.error("Error getting bulk sync status:", error);
        return null;
    }
}

export async function setBulkSyncStatus(status: SyncJobStatus | null) {
    try {
        if (status === null) {
            await prisma.systemSetting.deleteMany({
                where: { key: SYNC_JOB_KEY }
            });
        } else {
            await prisma.systemSetting.upsert({
                where: { key: SYNC_JOB_KEY },
                update: {
                    value: JSON.stringify(status),
                    description: "Status of the ongoing bulk sync job"
                },
                create: {
                    key: SYNC_JOB_KEY,
                    value: JSON.stringify(status),
                    description: "Status of the ongoing bulk sync job",
                    group: "SYSTEM"
                }
            });
        }
        revalidatePath("/admin/import");
    } catch (error) {
        console.error("Error setting bulk sync status:", error);
    }
}

export async function stopBulkSync() {
    try {
        const status = await getBulkSyncStatus();
        if (status && status.isSyncing) {
            console.log(`[SYNC_CANCEL] User cancelled sync at WP ${status.currentIdx}/${status.totalWps}`);

            await setBulkSyncStatus({
                ...status,
                isSyncing: false,
                stopped: true,
                lastUpdate: Date.now()
            });

            // Log cancellation event
            await prisma.importLog.create({
                data: {
                    type: 'MANUAL_SYNC',
                    status: 'ERROR',
                    filename: `manual_bulk_sync_CANCELLED_${new Date().toISOString().split('T')[0]}`,
                    totalRows: status.totalWps,
                    processedCount: status.results.success,
                    errors: JSON.stringify({
                        cancelled: true,
                        cancelledAt: status.currentIdx,
                        totalProcessed: status.currentIdx,
                        success: status.results.success,
                        errors: status.results.errors,
                        executionTime: Date.now() - (status.startTime || Date.now()),
                        syncDays: status.syncDays || 'FULL'
                    }),
                    date: new Date()
                }
            });
        }
    } catch (error) {
        console.error("Error stopping bulk sync:", error);
    }
}
