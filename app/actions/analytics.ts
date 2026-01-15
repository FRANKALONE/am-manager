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

        // Transform data for Next.js serialization (dates to ISO strings, null to undefined)
        return clients.map(client => ({
            ...client,
            workPackages: client.workPackages.map(wp => ({
                ...wp,
                validityPeriods: wp.validityPeriods.map(vp => ({
                    ...vp,
                    startDate: vp.startDate.toISOString(),
                    endDate: vp.endDate.toISOString(),
                    premiumPrice: vp.premiumPrice ?? undefined,
                    regularizationRate: vp.regularizationRate ?? undefined,
                    regularizationType: vp.regularizationType ?? undefined,
                    surplusStrategy: vp.surplusStrategy ?? undefined,
                    rateEvolutivo: vp.rateEvolutivo ?? undefined
                }))
            }))
        })) as any; // Type assertion needed due to date string conversion
    } catch (error) {
        console.error("Error fetching contract validity data:", error);
        return [];
    }
}
