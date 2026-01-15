"use server";

import { prisma } from "@/lib/prisma";
import { getVisibilityFilter } from "@/lib/auth";

export async function getContractValidityData() {
    try {
        const filter = await getVisibilityFilter();

        // Fetch clients based on visibility
        const clients = await prisma.client.findMany({
            where: filter.isGlobal ? {} : {
                OR: [
                    { id: { in: filter.clientIds || [] } },
                    { manager: filter.managerId }
                ]
            },
            include: {
                workPackages: {
                    where: filter.isGlobal ? {} : {
                        id: { in: filter.wpIds || [] }
                    },
                    include: {
                        validityPeriods: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Transform null to undefined and dates to Date objects for type compatibility
        return clients.map(client => ({
            ...client,
            workPackages: client.workPackages.map(wp => ({
                ...wp,
                validityPeriods: wp.validityPeriods.map(vp => ({
                    ...vp,
                    startDate: new Date(vp.startDate),
                    endDate: new Date(vp.endDate),
                    premiumPrice: vp.premiumPrice ?? undefined,
                    regularizationRate: vp.regularizationRate ?? undefined,
                    regularizationType: vp.regularizationType ?? undefined,
                    surplusStrategy: vp.surplusStrategy ?? undefined,
                    rateEvolutivo: vp.rateEvolutivo ?? undefined
                }))
            }))
        }));
    } catch (error) {
        console.error("Error fetching contract validity data:", error);
        return [];
    }
}
