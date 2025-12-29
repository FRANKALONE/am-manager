"use server";

import { prisma } from "@/lib/prisma";
import { syncWorkPackage } from "./sync";

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

        // 2. Process each WP
        for (const wp of wps) {
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
        }

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
