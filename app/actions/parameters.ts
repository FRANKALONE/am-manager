"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type ParameterState = {
    message?: string | null;
    error?: string | null;
};

// ----------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------

export async function getParametersByCategory(category: string) {
    try {
        const params = await prisma.parameter.findMany({
            where: { category, isActive: true },
            orderBy: { order: "asc" },
        });
        return params;
    } catch (error) {
        console.error("Failed to fetch parameters:", error);
        return [];
    }
}

export async function getAllParameters() {
    try {
        const params = await prisma.parameter.findMany({
            orderBy: [{ category: "asc" }, { order: "asc" }],
        });
        return params;
    } catch (error) {
        console.error("Failed to fetch all parameters:", error);
        return [];
    }
}

export async function createParameter(prevState: ParameterState, formData: FormData) {
    const category = formData.get("category") as string;
    const label = formData.get("label") as string;
    const value = formData.get("value") as string;

    // Simple validation
    if (!category || !label || !value) {
        return { error: "Todos los campos son obligatorios" };
    }

    try {
        // Get max order to append at the end
        const lastParam = await prisma.parameter.findFirst({
            where: { category },
            orderBy: { order: 'desc' }
        });
        const nextOrder = (lastParam?.order || 0) + 1;

        await prisma.parameter.create({
            data: {
                category,
                label,
                value: value.toUpperCase().replace(/\s+/g, '_'), // Normalize value
                order: nextOrder,
            },
        });

        revalidatePath("/admin/settings");
        return { message: "Parámetro creado correctamente" };
    } catch (error: any) {
        console.error("Error creating parameter:", error);
        if (error.code === 'P2002') {
            return { error: "Ya existe un parámetro con ese valor en esta categoría" };
        }
        return { error: "Error al crear el parámetro: " + (error.message || "Error desconocido") };
    }
}

export async function updateParameter(id: number, isActive: boolean) {
    try {
        await prisma.parameter.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar estado" };
    }
}

export async function deleteParameter(id: number) {
    try {
        await prisma.parameter.delete({
            where: { id }
        });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar parámetro" };
    }
}

export async function toggleKillSwitch(active: boolean) {
    try {
        await prisma.parameter.upsert({
            where: {
                // Since Parameter doesn't have a unique constraint on category+label, 
                // we'll find it first or use a convention.
                // For simplicity, let's just find the first one or create it.
                id: (await prisma.parameter.findFirst({
                    where: { category: 'SYSTEM', label: 'SYNC_KILL_SWITCH' }
                }))?.id || -1
            },
            update: { value: active ? 'true' : 'false', isActive: true },
            create: {
                category: 'SYSTEM',
                label: 'SYNC_KILL_SWITCH',
                value: active ? 'true' : 'false',
                isActive: true,
                order: 0
            }
        });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error toggling kill switch:", error);
        return { success: false, error: "Error al cambiar el estado del interruptor" };
    }
}

export async function getKillSwitchStatus() {
    try {
        const param = await prisma.parameter.findFirst({
            where: { category: 'SYSTEM', label: 'SYNC_KILL_SWITCH' }
        });
        return param?.value === 'true';
    } catch (error) {
        return false;
    }
}
