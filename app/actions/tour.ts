"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function completeOnboardingTour(userId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { hasCompletedTour: true }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error completing tour:", error);
        return { success: false, error: "Failed to update tour status" };
    }
}

export async function resetOnboardingTour(userId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { hasCompletedTour: false }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error resetting tour:", error);
        return { success: false, error: "Failed to reset tour status" };
    }
}
