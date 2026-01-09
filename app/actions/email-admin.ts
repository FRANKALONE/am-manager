"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEmailLogs(limit: number = 50) {
    try {
        return await prisma.emailLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    } catch (error) {
        console.error("Error fetching email logs:", error);
        return [];
    }
}

export async function getEmailSettings() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: { group: 'EMAIL' }
        });

        // Convert to a more usable object
        return settings.reduce((acc: any, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
    } catch (error) {
        console.error("Error fetching email settings:", error);
        return {};
    }
}

export async function updateEmailSettings(data: Record<string, string>) {
    try {
        const promises = Object.entries(data).map(([key, value]) => {
            return prisma.systemSetting.upsert({
                where: { key },
                update: { value },
                create: {
                    key,
                    value,
                    group: 'EMAIL'
                }
            });
        });

        await Promise.all(promises);
        revalidatePath("/admin/emails");
        return { success: true };
    } catch (error) {
        console.error("Error updating email settings:", error);
        return { success: false, error: "Error al actualizar la configuración" };
    }
}

export async function clearEmailLogs() {
    try {
        await prisma.emailLog.deleteMany({});
        revalidatePath("/admin/emails");
        return { success: true };
    } catch (error) {
        console.error("Error clearing email logs:", error);
        return { success: false, error: "Error al limpiar los logs" };
    }
}
