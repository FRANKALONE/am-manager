"use server";

import { prisma } from "@/lib/prisma";
import { createNotification, notifyRenewal } from "./notifications";
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
            for (const user of recipients) {
                await createNotification("CONTRACT_ENDING", {
                    wpName: wp.name,
                    clientName: wp.client.name,
                    endDate: formatDate(currentPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' })
                }, wp.id);
            }

            // 2. Notify Client Users
            for (const user of wp.client.users) {
                await createNotification("CONTRACT_ENDING_CLIENT", {
                    wpName: wp.name,
                    endDate: formatDate(currentPeriod.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' })
                }, wp.id);
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

        const ipcFactor = 1 + (ipcIncrement / 100);
        const newRate = lastPeriod.rate * ipcFactor;
        const newRateEvolutivo = lastPeriod.rateEvolutivo ? lastPeriod.rateEvolutivo * ipcFactor : null;
        const newRegularizationRate = lastPeriod.regularizationRate ? lastPeriod.regularizationRate * ipcFactor : null;

        // Create new validity period
        const newPeriod = await prisma.validityPeriod.create({
            data: {
                workPackageId: wpId,
                startDate: newStartDate,
                endDate: newEndDate,
                totalQuantity: lastPeriod.totalQuantity,
                rate: newRate,
                rateEvolutivo: newRateEvolutivo,
                isPremium: lastPeriod.isPremium,
                premiumPrice: lastPeriod.premiumPrice,
                scopeUnit: lastPeriod.scopeUnit,
                regularizationRate: newRegularizationRate,
                regularizationType: lastPeriod.regularizationType,
                surplusStrategy: lastPeriod.surplusStrategy
            }
        });

        const endDateFormat = formatDate(newEndDate, { year: 'numeric', month: '2-digit', day: '2-digit' });

        await notifyRenewal(wpId, 'IPC', {
            endDate: endDateFormat,
            ipcValue: ipcIncrement,
            newRate: newRate.toFixed(2)
        });

        revalidatePath("/admin/renewals");
        revalidatePath("/admin/work-packages");

        return { success: true, newPeriodId: newPeriod.id };

    } catch (error: any) {
        console.error("Error in renewWorkPackageAuto:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Renews a WP with the same conditions for an equal period (no IPC increment).
 */
export async function renewWorkPackageSameConditions(wpId: string) {
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

        // Create new validity period with SAME conditions (no IPC)
        const newPeriod = await prisma.validityPeriod.create({
            data: {
                workPackageId: wpId,
                startDate: newStartDate,
                endDate: newEndDate,
                totalQuantity: lastPeriod.totalQuantity,
                rate: lastPeriod.rate,
                rateEvolutivo: lastPeriod.rateEvolutivo,
                isPremium: lastPeriod.isPremium,
                premiumPrice: lastPeriod.premiumPrice,
                scopeUnit: lastPeriod.scopeUnit,
                regularizationRate: lastPeriod.regularizationRate,
                regularizationType: lastPeriod.regularizationType,
                surplusStrategy: lastPeriod.surplusStrategy
            }
        });

        const endDateFormat = formatDate(newEndDate, { year: 'numeric', month: '2-digit', day: '2-digit' });

        await notifyRenewal(wpId, 'NEW_CONDITIONS', {
            endDate: endDateFormat,
            rate: lastPeriod.rate.toFixed(2),
            quantity: lastPeriod.totalQuantity,
            unit: lastPeriod.scopeUnit,
            startDate: formatDate(newStartDate, { year: 'numeric', month: '2-digit', day: '2-digit' })
        });

        revalidatePath("/admin/renewals");
        revalidatePath("/admin/work-packages");

        return { success: true, newPeriodId: newPeriod.id };

    } catch (error: any) {
        console.error("Error in renewWorkPackageSameConditions:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Marks a WP as not renewing by setting its renewalType to 'NONE'.
 */
export async function cancelWorkPackageRenewal(wpId: string) {
    try {
        await prisma.workPackage.update({
            where: { id: wpId },
            data: { renewalType: 'NONE' }
        });

        revalidatePath("/admin/renewals");
        revalidatePath("/admin/work-packages");

        return { success: true };
    } catch (error: any) {
        console.error("Error in cancelWorkPackageRenewal:", error);
        return { success: false, error: error.message };
    }
}

import { getVisibilityFilter } from "@/lib/auth";

export async function getExpiringWPs(filters?: { clientId?: string, contractType?: string, startDate?: Date, endDate?: Date }) {
    try {
        const filter = await getVisibilityFilter();
        const today = new Date();
        const sixtyDaysOut = new Date();
        sixtyDaysOut.setDate(today.getDate() + 60);

        // Date range for the query
        const queryStartDate = filters?.startDate || new Date(2025, 11, 1); // Default to Dec 1, 2025
        const queryEndDate = filters?.endDate || sixtyDaysOut;

        const where: any = {
            renewalType: { not: 'NONE' },
            validityPeriods: {
                some: {
                    endDate: {
                        gte: queryStartDate,
                        lte: queryEndDate
                    }
                }
            }
        };

        if (!filter.isGlobal) {
            where.client = {
                OR: []
            };
            if (filter.clientIds) {
                where.client.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.client.OR.push({ manager: filter.managerId });
            }
            if (where.client.OR.length === 0) return [];
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
