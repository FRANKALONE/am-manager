"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Get ALL Regularizations (for admin panel)
export async function getAllRegularizations() {
    try {
        const regularizations = await prisma.regularization.findMany({
            include: {
                workPackage: {
                    include: {
                        client: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        return regularizations;
    } catch (error) {
        console.error("Error fetching regularizations:", error);
        return [];
    }
}

// Get Regularizations for a WP
export async function getRegularizations(workPackageId: string) {
    try {
        return await prisma.regularization.findMany({
            where: { workPackageId },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching regularizations:", error);
        return [];
    }
}

// Get single Regularization
export async function getRegularization(id: number) {
    try {
        return await prisma.regularization.findUnique({
            where: { id },
            include: {
                workPackage: {
                    include: {
                        client: true
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching regularization:", error);
        return null;
    }
}

// Create Regularization
export async function createRegularization(data: {
    workPackageId: string;
    date: Date;
    type: "EXCESS" | "RETURN" | "MANUAL_CONSUMPTION" | "SOBRANTE_ANTERIOR"; // "EXCESS", "RETURN", "MANUAL_CONSUMPTION", "SOBRANTE_ANTERIOR"
    quantity: number;
    description?: string;
    ticketId?: string;
    note?: string;
}) {
    try {
        const regularization = await prisma.regularization.create({
            data
        });

        revalidatePath('/admin/regularizations');
        revalidatePath(`/admin/work-packages/${data.workPackageId}/edit`);
        return { success: true, regularization };
    } catch (error: any) {
        console.error("Error creating regularization:", error);
        return {
            success: false,
            error: `Error al crear regularización: ${error.message || "Error desconocido"}`
        };
    }
}

// Update Regularization
export async function updateRegularization(id: number, data: {
    workPackageId?: string;
    date?: Date;
    type?: string;
    quantity?: number;
    description?: string;
    ticketId?: string;
    note?: string;
}) {
    try {
        const regularization = await prisma.regularization.update({
            where: { id },
            data
        });

        revalidatePath('/admin/regularizations');
        revalidatePath(`/admin/work-packages/${regularization.workPackageId}/edit`);
        return { success: true, regularization };
    } catch (error) {
        console.error("Error updating regularization:", error);
        return { success: false, error: "Error al actualizar regularización" };
    }
}

// Delete Regularization
export async function deleteRegularization(id: number) {
    try {
        const reg = await prisma.regularization.delete({
            where: { id }
        });
        revalidatePath('/admin/regularizations');
        revalidatePath(`/admin/work-packages/${reg.workPackageId}/edit`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting regularization:", error);
        return { success: false, error: "Error al eliminar regularización" };
    }
}

// Get Work Packages for dropdown
export async function getWorkPackagesForRegularization() {
    try {
        return await prisma.workPackage.findMany({
            select: {
                id: true,
                name: true,
                contractType: true,
                client: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error("Error fetching work packages:", error);
        return [];
    }
}

// Repair Database ID Sequences (PostgreSQL only)
export async function repairRegularizationSequence() {
    try {
        const tables = [
            'Parameter',
            'Regularization',
            'ValidityPeriod',
            'CorrectionModel',
            'WPCorrection',
            'MonthlyMetric',
            'WorklogDetail',
            'Ticket',
            'ImportLog'
        ];

        for (const table of tables) {
            try {
                // This resets the sequence to the current max ID + 1
                await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id),0) + 1, false) FROM "${table}";`);
            } catch (e: any) {
                console.warn(`Could not repair sequence for table ${table}: ${e.message}`);
            }
        }

        revalidatePath('/admin/settings');
        revalidatePath('/admin/regularizations');
        return { success: true };
    } catch (error: any) {
        console.error("Error repairing sequences:", error);
        return { success: false, error: `Error reparando secuencias: ${error.message}` };
    }
}
