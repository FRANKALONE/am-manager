"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTranslations } from "@/lib/get-translations";

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
            const { t } = await getTranslations();
            return { success: true, matchedCount: 0, message: t('common.noData') };
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

        const { t } = await getTranslations();
        return {
            success: true,
            matchedCount,
            deletedCount,
            dryRun,
            details,
            message: t('admin.maintenance.cleanup.success')
        };

    } catch (error: any) {
        console.error("[MAINTENANCE] Error cleaning up manual consumos:", error);
        const { t } = await getTranslations();
        return { success: false, error: t('errors.generic') };
    }
}

/**
 * Apply migration to add reviewedForDuplicates field to Regularization table
 */
export async function applyReviewedForDuplicatesMigration() {
    try {
        console.log('[MAINTENANCE] Applying reviewedForDuplicates migration...');

        // Check if column already exists
        const checkResult = await prisma.$queryRawUnsafe<any[]>(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Regularization' 
            AND column_name = 'reviewedForDuplicates'
        `);

        if (checkResult.length > 0) {
            const { t } = await getTranslations();
            return {
                success: true,
                alreadyExists: true,
                message: t('admin.maintenance.migration.exists')
            };
        }

        // Add the column
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Regularization" 
            ADD COLUMN "reviewedForDuplicates" BOOLEAN NOT NULL DEFAULT false
        `);

        // Add index for better performance
        await prisma.$executeRawUnsafe(`
            CREATE INDEX "Regularization_reviewedForDuplicates_idx" 
            ON "Regularization"("reviewedForDuplicates")
        `);

        console.log('[MAINTENANCE] Migration applied successfully');

        const { t } = await getTranslations();
        return {
            success: true,
            alreadyExists: false,
            message: t('admin.maintenance.migration.success')
        };

    } catch (error: any) {
        console.error("[MAINTENANCE] Error applying migration:", error);
        const { t } = await getTranslations();
        return {
            success: false,
            error: t('errors.migrationError')
        };
    }
}
