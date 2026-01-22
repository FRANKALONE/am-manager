"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTeamMembersForManagement() {
    try {
        return await prisma.teamMember.findMany({
            orderBy: { name: 'asc' },
            include: {
                team: {
                    select: { name: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching team members:", error);
        return [];
    }
}

export async function updateTeamMemberLevel(id: string, level: string | null) {
    try {
        await prisma.teamMember.update({
            where: { id },
            data: { level }
        });

        revalidatePath("/admin/team-members");
        return { success: true };
    } catch (error) {
        console.error("Error updating team member level:", error);
        return { success: false, error: "Error al actualizar el nivel del miembro" };
    }
}

export async function bulkUpdateTeamMemberLevels(updates: { id: string; level: string | null }[]) {
    try {
        await Promise.all(
            updates.map(update =>
                prisma.teamMember.update({
                    where: { id: update.id },
                    data: { level: update.level }
                })
            )
        );

        revalidatePath("/admin/team-members");
        return { success: true };
    } catch (error) {
        console.error("Error bulk updating team member levels:", error);
        return { success: false, error: "Error al actualizar los niveles" };
    }
}
