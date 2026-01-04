"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserPreferences(
    userId: string,
    preferences: {
        locale?: string;
        timezone?: string;
    }
) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                locale: preferences.locale,
                timezone: preferences.timezone,
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating user preferences:", error);
        return { error: "Error al actualizar las preferencias" };
    }
}

export async function getUserPreferences(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                locale: true,
                timezone: true,
            },
        });

        return user;
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        return null;
    }
}
