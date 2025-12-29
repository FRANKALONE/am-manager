"use server";

import { prisma } from "@/lib/prisma";

export async function debugInspectFue652() {
    const ticketId = 'FUE-652';
    try {
        const regularizations = await prisma.regularization.findMany({
            where: { ticketId },
            include: {
                workPackage: {
                    select: { name: true }
                }
            }
        });

        const worklogs = await prisma.worklogDetail.findMany({
            where: { issueKey: ticketId },
            include: {
                workPackage: {
                    select: { name: true }
                }
            }
        });

        return { regularizations, worklogs };
    } catch (error: any) {
        return { error: error.message };
    }
}
