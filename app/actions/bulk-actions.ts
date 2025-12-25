"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteWorkPackagesBulk(ids: string[]) {
    if (!ids || ids.length === 0) return { error: "No se han seleccionado Work Packages" };

    try {
        // Since we have Cascade delete in most relations, 
        // deleting the WorkPackage should clean up related MonthlyMetrics, Tickets, and ValidityPeriods.
        // But WPCorrection doesn't seem to have cascade in the schema view I saw (let me check).

        await prisma.workPackage.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        revalidatePath("/admin/work-packages");
        return { success: true, count: ids.length };
    } catch (error) {
        console.error("Bulk delete failed:", error);
        return { error: "Error al eliminar los Work Packages en masa" };
    }
}
