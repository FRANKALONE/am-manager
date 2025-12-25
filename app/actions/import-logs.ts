"use server";

import { prisma } from "@/lib/prisma";

export async function getImportLogs() {
    try {
        return await prisma.importLog.findMany({
            orderBy: { date: 'desc' },
            take: 50
        });
    } catch (error) {
        console.error("Failed to fetch import logs:", error);
        return [];
    }
}

export async function clearImportLogs() {
    try {
        await prisma.importLog.deleteMany({});
        return { success: true };
    } catch (error) {
        console.error("Failed to clear import logs:", error);
        return { error: "Failed to clear logs" };
    }
}
