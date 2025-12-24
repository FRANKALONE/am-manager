"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCorrectionModels() {
    try {
        return await prisma.correctionModel.findMany({
            where: { status: "active" },
            orderBy: { isDefault: "desc" } // Default first
        });
    } catch (error) {
        return [];
    }
}

export async function getWPCorrections(wpId: string) {
    try {
        return await prisma.wPCorrection.findMany({
            where: { workPackageId: wpId },
            include: { correctionModel: true },
            orderBy: { startDate: "desc" }
        });
    } catch (error) {
        return [];
    }
}

export async function addWPCorrection(wpId: string, modelId: number, startDate: Date, endDate?: Date) {
    try {
        await prisma.wPCorrection.create({
            data: {
                workPackageId: wpId,
                correctionModelId: modelId,
                startDate,
                endDate
            }
        });
        revalidatePath(`/admin/work-packages/${wpId}/edit`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al asignar modelo" };
    }
}

export async function deleteWPCorrection(id: number, wpId: string) {
    try {
        await prisma.wPCorrection.delete({ where: { id } });
        revalidatePath(`/admin/work-packages/${wpId}/edit`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar asignación" };
    }
}
