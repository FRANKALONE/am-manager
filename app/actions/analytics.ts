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

        return clients;
    } catch (error) {
        console.error("Error fetching contract validity data:", error);
        return [];
    }
}
