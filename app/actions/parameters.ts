"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTranslations } from "@/lib/get-translations";

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
    const { t } = await getTranslations();
    if (!category || !label || !value) {
        return { error: t('errors.required', { field: t('admin.settings.title') }) }; // "Todos los campos" is generic, using a close one
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
        return { message: t('common.success') };
    } catch (error: any) {
        console.error("Error creating parameter:", error);
        const { t } = await getTranslations();
        if (error.code === 'P2002') {
            return { error: t('errors.alreadyExists', { item: t('admin.parameters') }) };
        }
        return { error: t('errors.createError', { item: t('admin.parameters') }) + ": " + (error.message || t('errors.unknown')) };
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
        const { t } = await getTranslations();
        return { success: false, error: t('errors.updateError', { item: t('common.status') }) };
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
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('admin.parameters') }) };
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
        const { t } = await getTranslations();
        return { success: false, error: t('errors.updateError', { item: 'Kill Switch' }) };
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
