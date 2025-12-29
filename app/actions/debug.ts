"use server";

import { prisma } from "@/lib/prisma";

export async function debugGetFai320Regs() {
    const regs = await prisma.regularization.findMany({
        where: {
            ticketId: "FAI-320",
            type: "MANUAL_CONSUMPTION"
        },
        include: {
            workPackage: {
                select: { name: true, id: true }
            }
        }
    });

    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            issueKey: "FAI-320",
            tipoImputacion: "Consumo Manual"
        }
    });

    return { regs, worklogs };
}
