"use server";

import { prisma } from "@/lib/prisma";
import { syncWorkPackage } from "./sync";
import { limitConcurrency } from "@/lib/utils-sync";
import { getBulkSyncStatus, setBulkSyncStatus, SyncJobStatus } from "./sync-jobs";
import { getNow } from "@/lib/date-utils";

async function isKillSwitchActive() {
    try {
        const killSwitch = await prisma.parameter.findFirst({
            where: {
                category: 'SYSTEM',
                label: 'SYNC_KILL_SWITCH',
                value: 'true',
                isActive: true
            }
        });
        return !!killSwitch;
    } catch (e) {
        return false;
    }
}

export async function getEligibleWorkPackagesForSync() {
    try {
        const wps = await prisma.workPackage.findMany({
            where: {
                contractType: {
                    in: ['BOLSA', 'BD', 'EVENTOS', 'bolsa', 'bd', 'eventos']
                }
            },
            select: { id: true, name: true }
        });
        return wps;
    } catch (error) {
        console.error("Error fetching eligible WPs:", error);
        return [];
    }
}

export async function syncAllWorkPackages() {
    const startTime = new Date();
    const results: any[] = [];
    const duplicatesDetected: any[] = [];

    try {
        // 1. Get all WPs that match the allowed contract types for sync
        const wps = await prisma.workPackage.findMany({
            where: {
                contractType: {
                    in: ['BOLSA', 'BD', 'EVENTOS', 'bolsa', 'bd', 'eventos']
                }
            },
            select: { id: true, name: true }
        });

        console.log(`[CRON] Found ${wps.length} work packages to sync.`);

        // 2. Process WPs with controlled concurrency (Parallel)
        const wpTasks = wps.map(wp => async () => {
            // Check Kill Switch before starting each WP
            if (await isKillSwitchActive()) {
                console.log(`[CRON] Kill Switch active. Aborting sync for ${wp.id}`);
                results.push({
                    id: wp.id,
                    name: wp.name,
                    status: "ABORTED",
                    error: "Parada de emergencia activada"
                });
                return;
            }

            console.log(`[CRON] Syncing WP: ${wp.id} (${wp.name})...`);
            try {
                const res = await syncWorkPackage(wp.id, false);

                if (res.error) {
                    results.push({
                        id: wp.id,
                        name: wp.name,
                        status: "ERROR",
                        error: res.error
                    });
                } else {
                    const hasDuplicates = (res.duplicateConsumptions && res.duplicateConsumptions.length > 0);

                    if (hasDuplicates) {
                        duplicatesDetected.push({
                            wpId: wp.id,
                            wpName: wp.name,
                            duplicates: res.duplicateConsumptions
                        });
                    }

                    results.push({
                        id: wp.id,
                        name: wp.name,
                        status: "SUCCESS",
                        totalHours: res.totalHours,
                        processed: res.processed,
                        hasDuplicates
                    });
                }
            } catch (err: any) {
                console.error(`[CRON] Error syncing ${wp.id}:`, err);
                results.push({
                    id: wp.id,
                    name: wp.name,
                    status: "CRITICAL_ERROR",
                    error: err.message || "Error desconocido"
                });
            }
        });

        // Run up to 3 WPs in parallel
        await limitConcurrency(wpTasks, 3);

        // 3. Create a summary for the log
        const successCount = results.filter(r => r.status === "SUCCESS").length;
        const errorCount = results.length - successCount;

        const summary = {
            executionTime: new Date().getTime() - startTime.getTime(),
            totalProcessed: wps.length,
            success: successCount,
            errors: errorCount,
            details: results,
            duplicates: duplicatesDetected
        };

        // 4. Save to ImportLog (reusing existing model to avoid migrations)
        await prisma.importLog.create({
            data: {
                type: 'CRON_SYNC',
                status: errorCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'PARTIAL' : 'ERROR'),
                filename: `sync_${startTime.toISOString().split('T')[0]}`,
                totalRows: wps.length,
                processedCount: successCount,
                errors: JSON.stringify(summary)
            }
        });

        return { success: true, summary };
    } catch (error: any) {
        console.error("[CRON] Fatal error in syncAllWorkPackages:", error);

        // Try to log the failure
        await prisma.importLog.create({
            data: {
                type: 'CRON_SYNC',
                status: 'ERROR',
                filename: `sync_FAILED_${startTime.toISOString()}`,
                errors: JSON.stringify({ fatalError: error.message })
            }
        }).catch(() => { });

        return { success: false, error: error.message };
    }
}

export async function startBulkManualSync(syncDays?: number) {
    try {
        const wps = await getEligibleWorkPackagesForSync();

        if (wps.length === 0) {
            return { error: "No work packages to sync" };
        }

        const startTime = Date.now();
        const initialStatus: SyncJobStatus = {
            isSyncing: true,
            progress: 0,
            currentIdx: 0,
            totalWps: wps.length,
            currentWpName: "",
            startTime,
            results: { success: 0, errors: 0 },
            syncDays: syncDays || null,
            lastUpdate: startTime
        };

        await setBulkSyncStatus(initialStatus);

        // Run sync in the "background" (but still within this server action until done)
        // Note: Real background tasks in Next.js require external queues, 
        // but for this app, we'll process them and the client can refresh to see progress.

        // We'll process them sequentially or with low concurrency to avoid overloading
        for (let i = 0; i < wps.length; i++) {
            const wp = wps[i];

            // Re-fetch status to check for cancellation or stop
            const currentStatus = await getBulkSyncStatus();
            if (!currentStatus || !currentStatus.isSyncing) break;

            // Update status for current WP
            await setBulkSyncStatus({
                ...currentStatus,
                currentIdx: i + 1,
                currentWpName: wp.name,
                progress: (i / wps.length) * 100,
                lastUpdate: Date.now()
            });

            try {
                const res = await syncWorkPackage(wp.id, false, syncDays);

                const updatedStatus = await getBulkSyncStatus();
                if (updatedStatus) {
                    if (res?.error) {
                        updatedStatus.results.errors++;
                    } else {
                        updatedStatus.results.success++;
                    }
                    await setBulkSyncStatus(updatedStatus);
                }
            } catch (err) {
                const updatedStatus = await getBulkSyncStatus();
                if (updatedStatus) {
                    updatedStatus.results.errors++;
                    await setBulkSyncStatus(updatedStatus);
                }
            }
        }

        const finalStatus = await getBulkSyncStatus();
        if (finalStatus) {
            await setBulkSyncStatus({
                ...finalStatus,
                isSyncing: false,
                progress: 100,
                lastUpdate: Date.now()
            });

            // Save to ImportLog
            await prisma.importLog.create({
                data: {
                    type: 'MANUAL_SYNC',
                    status: finalStatus.results.errors === 0 ? 'SUCCESS' : (finalStatus.results.success > 0 ? 'PARTIAL' : 'ERROR'),
                    filename: `manual_bulk_sync_${syncDays ? `fast_${syncDays}d` : 'total'}_${new Date().toISOString().split('T')[0]}`,
                    totalRows: wps.length,
                    processedCount: finalStatus.results.success,
                    errors: JSON.stringify({
                        totalProcessed: wps.length,
                        success: finalStatus.results.success,
                        errors: finalStatus.results.errors,
                        executionTime: Date.now() - startTime,
                        syncDays: syncDays || 'FULL'
                    }),
                    date: new Date()
                }
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error in startBulkManualSync:", error);
        return { error: error.message };
    }
}
