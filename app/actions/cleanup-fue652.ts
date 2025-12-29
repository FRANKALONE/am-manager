"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function cleanupFUE652() {
    try {
        const deleted = await prisma.worklogDetail.deleteMany({
            where: {
                issueKey: 'FUE-652',
                workPackageId: 'AMA30313MANT0001.1.2',
                year: 2025,
                month: 2
            }
        });

        revalidatePath('/dashboard');
        return { success: true, count: deleted.count };
    } catch (error: any) {
        return { error: error.message };
    }
}
