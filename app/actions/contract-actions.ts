"use server";

import { prisma } from "@/lib/prisma";
import { createNotification } from "./notifications";
import { revalidatePath } from "next/cache";
import { formatDate, getNow } from "@/lib/date-utils";

/**
 * Checks for contracts ending in 45 days and sends notifications.
 * Should be called by a cron job or manual trigger.
 */
export async function checkContractExpirations() {
    try {
        const today = getNow();
        const targetDate = getNow();
        targetDate.setDate(today.getDate() + 45);

        // Define range for "45 days from now" (the whole day)
        const startOfTarget = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfTarget = new Date(targetDate.setHours(23, 59, 59, 999));

        const expiringWPs = await prisma.workPackage.findMany({
            where: {
                validityPeriods: {
                    some: {
                        endDate: {
                            gte: startOfTarget,
                            lte: endOfTarget
                        }
                    }
                }
            },
            include: {
                client: {
                    include: {
                        users: true
                    }
                },
                validityPeriods: {
                    orderBy: { endDate: 'desc' }
                }
            }
        });

        console.log(`[EXPIRATIONS] Found ${expiringWPs.length} WPs expiring on ${targetDate.toDateString()}`);

        for (const wp of expiringWPs) {
            const currentPeriod = wp.validityPeriods[0];
            const managerId = wp.client.manager;

            // 1. Notify Admins and Manager
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
            const recipients = [...admins];

            // Add manager if they exist and are not already in admin list
            if (managerId && !admins.some(a => a.id === managerId)) {
                const manager = await prisma.user.findUnique({ where: { id: managerId } });
                if (manager) recipients.push(manager);
            }

            const title = `⚠️ Contrato por vencer: ${wp.client.name}`;
            const message = `El Work Package "${wp.name}" finaliza el ${formatDate(currentPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}. Por favor, gestionad la renovación.`;

            for (const user of recipients) {
                await createNotification(user.id, "CONTRACT_ENDING", title, message, wp.id);
            }

            // 2. Notify Client Users
            const clientMessage = `Tu periodo de contrato para "${wp.name}" finalizará el ${formatDate(currentPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}.`;
            for (const user of wp.client.users) {
                await createNotification(user.id, "CONTRACT_ENDING_CLIENT", "Fin de periodo de contrato", clientMessage, wp.id);
            }
        }

        return { success: true, count: expiringWPs.length };
    } catch (error) {
        console.error("Error checking contract expirations:", error);
        return { success: false, error: "Error al comprobar expiraciones" };
    }
}

/**
 * Performs an automatic renewal for a WP with AUTO renewal type.
 */
export async function renewWorkPackageAuto(wpId: string, ipcIncrement: number) {
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                validityPeriods: {
                    orderBy: { endDate: 'desc' },
                    take: 1
                },
                client: {
                    include: { users: true }
                }
            }
        });

        if (!wp || wp.validityPeriods.length === 0) {
            throw new Error("Work Package or validity period not found");
        }

        const lastPeriod = wp.validityPeriods[0];
        const durationMs = lastPeriod.endDate.getTime() - lastPeriod.startDate.getTime();

        const newStartDate = new Date(lastPeriod.endDate);
        newStartDate.setDate(newStartDate.getDate() + 1);

        const newEndDate = new Date(newStartDate.getTime() + durationMs);
        const newRate = lastPeriod.rate * (1 + (ipcIncrement / 100));

        // Create new validity period
        const newPeriod = await prisma.validityPeriod.create({
            data: {
                workPackageId: wpId,
                startDate: newStartDate,
                endDate: newEndDate,
                totalQuantity: lastPeriod.totalQuantity,
                rate: newRate,
                isPremium: lastPeriod.isPremium,
                premiumPrice: lastPeriod.premiumPrice,
                scopeUnit: lastPeriod.scopeUnit,
                regularizationRate: lastPeriod.regularizationRate,
                regularizationType: lastPeriod.regularizationType,
                surplusStrategy: lastPeriod.surplusStrategy
            }
        });

        // Notify Admins, Manager and Client
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        const managerId = wp.client.manager;
        const staffRecipients = [...admins];
        if (managerId && !admins.some(a => a.id === managerId)) {
            const manager = await prisma.user.findUnique({ where: { id: managerId } });
            if (manager) staffRecipients.push(manager);
        }

        const staffTitle = `✅ Renovación Automática: ${wp.name}`;
        const staffMsg = `Se ha renovado automáticamente el WP "${wp.name}" hasta el ${formatDate(newEndDate, { year: 'numeric', month: '2-digit', day: '2-digit' })} con un incremento del ${ipcIncrement}% (Tarifa: ${newRate.toFixed(2)}€).`;

        for (const user of staffRecipients) {
            await createNotification(user.id, "CONTRACT_RENEWED", staffTitle, staffMsg, wp.id);
        }

        const clientMsg = `Se ha renovado el periodo de servicio para "${wp.name}" hasta el ${formatDate(newEndDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}.`;
        for (const user of wp.client.users) {
            await createNotification(user.id, "CONTRACT_RENEWED_CLIENT", "Contrato Renovado", clientMsg, wp.id);
        }

        revalidatePath("/admin/renewals");
        revalidatePath("/admin/work-packages");

        return { success: true, newPeriodId: newPeriod.id };

    } catch (error: any) {
        console.error("Error in renewWorkPackageAuto:", error);
        return { success: false, error: error.message };
    }
}

export async function getExpiringWPs(managerId?: string, filters?: { clientId?: string, contractType?: string, startDate?: Date, endDate?: Date }) {
    try {
        const today = new Date();
        const sixtyDaysOut = new Date();
        sixtyDaysOut.setDate(today.getDate() + 60);

        // Date range for the query
        const queryStartDate = filters?.startDate || new Date(2025, 11, 1); // Default to Dec 1, 2025
        const queryEndDate = filters?.endDate || sixtyDaysOut;

        const where: any = {
            validityPeriods: {
                some: {
                    endDate: {
                        gte: queryStartDate,
                        lte: queryEndDate
                    }
                }
            }
        };

        if (managerId) {
            where.client = { manager: managerId };
        }

        if (filters?.clientId) {
            where.clientId = filters.clientId;
        }

        if (filters?.contractType) {
            where.contractType = filters.contractType;
        }

        const wps = await prisma.workPackage.findMany({
            where,
            include: {
                client: true,
                validityPeriods: {
                    orderBy: { endDate: 'desc' }
                }
            }
        });

        // Filter valid periods on the application side to ensure the LATEST is within range
        return wps.filter(wp => {
            const latestEndDate = wp.validityPeriods[0]?.endDate;
            if (!latestEndDate) return false;
            return latestEndDate >= queryStartDate && latestEndDate <= queryEndDate;
        });
    } catch (error) {
        console.error("Error loading expiring WPs:", error);
        return [];
    }
}
