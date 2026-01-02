"use server";

import { prisma } from "@/lib/prisma";

export interface EvolutivoForBilling {
    issueKey: string;
    issueSummary: string;
    billingMode: string;
    workedHours: number;
    workPackageId: string;
    workPackageName: string;
    clientName: string;
    isBilled?: boolean;
}

export async function markEvolutivoAsBilled(issueKey: string, year: number, month: number, wpId: string) {
    try {
        const date = new Date(year, month - 1, 1);

        await prisma.regularization.create({
            data: {
                workPackageId: wpId,
                date,
                type: 'EVOLUTIVO_FACTURADO',
                quantity: 0,
                description: `Facturación evolutivo ${issueKey} - ${month}/${year}`,
                ticketId: issueKey,
                isBilled: true
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error marking evolutivo as billed:", error);
        return { success: false, error: error.message };
    }
}

export async function unmarkEvolutivoAsBilled(issueKey: string, year: number, month: number) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        await prisma.regularization.deleteMany({
            where: {
                ticketId: issueKey,
                type: 'EVOLUTIVO_FACTURADO',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error unmarking evolutivo as billed:", error);
        return { success: false, error: error.message };
    }
}

export async function getEvolutivosForBilling(clientId: string | undefined | 'all', year: number, month: number) {
    try {
        const whereClause: any = {
            issueType: 'Evolutivo',
            billingMode: { in: ['T&M facturable', 'T&M Facturable', 'Facturable', 'facturable'] }
        };

        if (clientId && clientId !== 'all') {
            const workPackages = await prisma.workPackage.findMany({
                where: { clientId },
                select: { id: true }
            });
            const wpIds = workPackages.map(wp => wp.id);
            whereClause.workPackageId = { in: wpIds };
        }

        // Get all Evolutivos with billable modes
        const evolutivos = await prisma.ticket.findMany({
            where: whereClause,
            select: {
                issueKey: true,
                issueSummary: true,
                billingMode: true,
                workPackageId: true,
                workPackage: {
                    select: {
                        name: true,
                        client: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // For each Evolutivo, get worklogs for the specified month
        const evolutivosWithHours: EvolutivoForBilling[] = [];

        // 5. Get billed status for all relevant tickets
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const billedRegs = await prisma.regularization.findMany({
            where: {
                type: 'EVOLUTIVO_FACTURADO',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: { ticketId: true }
        });

        const billedKeys = new Set(billedRegs.map(r => r.ticketId).filter(Boolean));

        for (const evo of evolutivos) {
            const worklogs = await prisma.worklogDetail.findMany({
                where: {
                    issueKey: evo.issueKey,
                    year,
                    month
                },
                select: {
                    timeSpentHours: true
                }
            });

            const totalHours = worklogs.reduce((sum: number, wl: { timeSpentHours: number }) => sum + wl.timeSpentHours, 0);

            // Only include Evolutivos with hours worked in this month
            if (totalHours > 0) {
                evolutivosWithHours.push({
                    issueKey: evo.issueKey,
                    issueSummary: evo.issueSummary || '',
                    billingMode: evo.billingMode || 'N/A',
                    workedHours: totalHours,
                    workPackageId: evo.workPackageId,
                    workPackageName: evo.workPackage?.name || '',
                    clientName: evo.workPackage?.client?.name || 'Varios',
                    isBilled: billedKeys.has(evo.issueKey)
                });
            }
        }

        return { success: true, evolutivos: evolutivosWithHours };
    } catch (error: any) {
        console.error("Error in getEvolutivosForBilling:", error);
        return { success: false, error: error.message, evolutivos: [] };
    }
}
