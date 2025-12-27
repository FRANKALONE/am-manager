"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Limpia las regularizaciones de tipo MANUAL_CONSUMPTION que coinciden con tickets sincronizados.
 * @param wpId ID del Work Package (opcional, si es null limpia todos)
 * @param dryRun Si es true, solo simula y devuelve lo que borraría sin ejecutar cambios.
 */
export async function cleanupManualConsumptions(wpId?: string, dryRun: boolean = true) {
    try {
        console.log(`[MAINTENANCE] Starting cleanup. WP: ${wpId || 'ALL'} (Dry Run: ${dryRun})`);

        const whereClause: any = {
            type: 'MANUAL_CONSUMPTION',
            ticketId: { not: null }
        };
        if (wpId) whereClause.workPackageId = wpId;

        // 1. Obtener los consumos manuales
        const manualRegs = await prisma.regularization.findMany({
            where: whereClause
        });

        if (manualRegs.length === 0) {
            return { success: true, matchedCount: 0, message: "No se encontraron consumos manuales con ticket Id para limpiar." };
        }

        let matchedCount = 0;
        let deletedCount = 0;
        const details = [];

        for (const reg of manualRegs) {
            if (!reg.ticketId) continue;

            const regDate = new Date(reg.date);
            const year = regDate.getFullYear();
            const month = regDate.getMonth() + 1;

            // 2. Verificar si existe un worklog sincronizado para ese ticket en el mismo mes y mismo WP
            const syncWorklog = await prisma.worklogDetail.findFirst({
                where: {
                    workPackageId: reg.workPackageId,
                    issueKey: reg.ticketId,
                    year,
                    month
                }
            });

            if (syncWorklog) {
                matchedCount++;
                const hoursMatch = Math.abs(syncWorklog.timeSpentHours - reg.quantity) < 0.01;

                details.push({
                    ticketId: reg.ticketId,
                    wpId: reg.workPackageId,
                    month: `${month}/${year}`,
                    manualHours: reg.quantity,
                    syncHours: syncWorklog.timeSpentHours,
                    exactMatch: hoursMatch
                });

                if (!dryRun) {
                    await prisma.regularization.delete({
                        where: { id: reg.id }
                    });
                    deletedCount++;
                }
            }
        }

        const actionDescription = dryRun ? "Se habrían eliminado" : "Se han eliminado";

        if (!dryRun && deletedCount > 0) {
            revalidatePath('/dashboard');
            revalidatePath('/admin/settings');
        }

        return {
            success: true,
            matchedCount,
            deletedCount,
            dryRun,
            details,
            message: `${actionDescription} ${dryRun ? matchedCount : deletedCount} consumos manuales que ya están cubiertos por la sincronización automática.`
        };

    } catch (error: any) {
        console.error("[MAINTENANCE] Error cleaning up manual consumos:", error);
        return { success: false, error: error.message };
    }
}
