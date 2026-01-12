"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";

export async function getRoles() {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' }
        });
        return roles;
    } catch (error) {
        console.error("Failed to fetch roles:", error);
        return [];
    }
}

export async function getRoleById(id: string) {
    try {
        return await prisma.role.findUnique({
            where: { id }
        });
    } catch (error) {
        return null;
    }
}

export async function createRole(prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const isActive = formData.get("isActive") === "on";
    const isPremium = formData.get("isPremium") === "on" ? 1 : 0;

    // Collect permissions
    const permissions: Record<string, boolean> = {};
    formData.forEach((value, key) => {
        if (key.startsWith("perm_")) {
            const permKey = key.replace("perm_", "");
            permissions[permKey] = value === "on";
        }
    });

    const { t } = await getTranslations();
    if (!name) return { error: t('errors.required', { field: t('common.name') }) };

    try {
        await prisma.role.create({
            data: {
                name,
                description: description || null,
                permissions: JSON.stringify(permissions),
                isActive,
                isPremium
            }
        });
    } catch (error: any) {
        console.error(error);
        const { t } = await getTranslations();
        if (error.code === 'P2002') {
            return { error: t('errors.alreadyExists', { item: t('roles.title') }) };
        }
        return { error: t('errors.createError', { item: t('roles.title') }) };
    }

    revalidatePath("/admin/roles");
    redirect("/admin/roles");
}

export async function updateRole(id: string, prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const isActive = formData.get("isActive") === "on";
    const isPremium = formData.get("isPremium") === "on" ? 1 : 0;

    // Collect permissions
    const permissions: Record<string, boolean> = {};
    formData.forEach((value, key) => {
        if (key.startsWith("perm_")) {
            const permKey = key.replace("perm_", "");
            permissions[permKey] = value === "on";
        }
    });

    const { t } = await getTranslations();
    if (!name) return { error: t('errors.required', { field: t('common.name') }) };

    try {
        await prisma.role.update({
            where: { id },
            data: {
                name,
                description: description || null,
                permissions: JSON.stringify(permissions),
                isActive,
                isPremium
            }
        });
    } catch (error: any) {
        console.error(error);
        const { t } = await getTranslations();
        if (error.code === 'P2002') {
            return { error: t('errors.alreadyExists', { item: t('roles.title') }) };
        }
        return { error: t('errors.updateError', { item: t('roles.title') }) };
    }

    revalidatePath("/admin/roles");
    redirect("/admin/roles");
}

export async function deleteRole(id: string) {
    try {
        await prisma.role.delete({ where: { id } });
        revalidatePath("/admin/roles");
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('roles.title') }) };
    }
}
