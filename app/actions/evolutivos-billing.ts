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
}

export async function getEvolutivosForBilling(clientId: string | undefined | 'all', year: number, month: number) {
    try {
        const whereClause: any = {
            issueType: { in: ['Evolutivo', 'Hitos Evolutivos'] },
            billingMode: { in: ['T&M Facturable', 'Facturable', 'Evolutivo T&M'] }
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
                    clientName: evo.workPackage?.client?.name || 'Varios'
                });
            }
        }

        return { success: true, evolutivos: evolutivosWithHours };
    } catch (error: any) {
        console.error("Error in getEvolutivosForBilling:", error);
        return { success: false, error: error.message, evolutivos: [] };
    }
}
