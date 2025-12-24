"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCorrectionModels() {
    try {
        return await prisma.correctionModel.findMany({
            orderBy: { id: 'asc' }
        });
    } catch (error) {
        return [];
    }
}

export async function createCorrectionModel(prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    let configStr = formData.get("config") as string;
    const isDefault = formData.get("isDefault") === "on";

    if (!name || !code) return { error: "Nombre y Código son obligatorios" };

    try {
        JSON.parse(configStr);
    } catch (e) {
        return { error: "El Config JSON no es válido" };
    }

    try {
        await prisma.correctionModel.create({
            data: {
                name,
                code,
                description,
                config: configStr,
                isDefault,
                status: "active"
            }
        });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        return { error: "Error al crear modelo (Código duplicado?)" };
    }
}

export async function deleteCorrectionModel(id: number) {
    try {
        await prisma.correctionModel.delete({ where: { id } });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar modelo" };
    }
}

export async function updateCorrectionModel(id: number, prevState: any, formData: FormData) {
    const name = formData.get("name") as string;
    // Code should probably not be editable easily if referenced
    const description = formData.get("description") as string;
    let configStr = formData.get("config") as string;
    const isDefault = formData.get("isDefault") === "on";

    try {
        JSON.parse(configStr);
    } catch (e) {
        return { error: "El Config JSON no es válido" };
    }

    try {
        if (isDefault) {
            // Unset others
            await prisma.correctionModel.updateMany({
                where: { id: { not: id } },
                data: { isDefault: false }
            });
        }

        await prisma.correctionModel.update({
            where: { id },
            data: {
                name,
                description,
                config: configStr,
                isDefault
            }
        });
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        return { error: "Error al actualizar modelo" };
    }
}
