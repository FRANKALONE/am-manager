// Deployment trigger: 2026-01-22 19:33
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export type SpecialRegularizationType = "RAPPEL" | "CONSULTANT_LEVEL";

export interface RappelTier {
    minHours: number;
    maxHours: number | null; // null means infinity
    rate: number;
}

export interface ConsultantLevelRate {
    [level: string]: number; // e.g., { "Junior": 45, "Senior": 60 }
}

export async function getSpecialRegularizations() {
    try {
        return await (prisma as any).specialRegularization.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { validityPeriods: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching special regularizations:", error);
        return [];
    }
}

export async function getSpecialRegularizationById(id: string) {
    try {
        return await (prisma as any).specialRegularization.findUnique({
            where: { id },
            include: {
                validityPeriods: {
                    include: {
                        workPackage: {
                            select: { id: true, name: true, clientName: true }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching special regularization:", error);
        return null;
    }
}

export async function createSpecialRegularization(data: {
    name: string;
    type: SpecialRegularizationType;
    config: RappelTier[] | ConsultantLevelRate;
}) {
    try {
        const configString = JSON.stringify(data.config);

        if (!(prisma as any).specialRegularization) {
            console.error("Prisma model 'specialRegularization' is missing. Check if client was generated.");
            return { success: false, error: "Error interno: El modelo de datos no está listo. Contacta con soporte." };
        }

        const reg = await (prisma as any).specialRegularization.create({
            data: {
                id: crypto.randomUUID(),
                name: data.name,
                type: data.type,
                config: configString,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/special-regularizations");
        return { success: true, data: reg };
    } catch (error: any) {
        console.error("Error creating special regularization:", error);
        return { success: false, error: `Error al crear la regularización especial: ${error.message || "Error desconocido"}` };
    }
}

export async function updateSpecialRegularization(
    id: string,
    data: {
        name?: string;
        type?: SpecialRegularizationType;
        config?: RappelTier[] | ConsultantLevelRate;
    }
) {
    try {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.type) updateData.type = data.type;
        if (data.config) updateData.config = JSON.stringify(data.config);

        const reg = await (prisma as any).specialRegularization.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/admin/special-regularizations");
        return { success: true, data: reg };
    } catch (error) {
        console.error("Error updating special regularization:", error);
        return { success: false, error: "Error al actualizar la regularización especial" };
    }
}

export async function deleteSpecialRegularization(id: string) {
    try {
        // Check if it's being used
        const reg = await (prisma as any).specialRegularization.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { validityPeriods: true }
                }
            }
        });

        if (reg && reg._count.validityPeriods > 0) {
            return {
                success: false,
                error: `No se puede eliminar. Está siendo usada por ${reg._count.validityPeriods} periodo(s) de validez.`
            };
        }

        await (prisma as any).specialRegularization.delete({
            where: { id }
        });

        revalidatePath("/admin/special-regularizations");
        return { success: true };
    } catch (error) {
        console.error("Error deleting special regularization:", error);
        return { success: false, error: "Error al eliminar la regularización especial" };
    }
}
