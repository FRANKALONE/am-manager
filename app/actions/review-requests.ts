"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

export async function createReviewRequest(
    wpId: string,
    requestedBy: string,
    worklogIds: number[],
    reason: string
) {
    try {
        // 1. Create the review request
        const reviewRequest = await prisma.reviewRequest.create({
            data: {
                workPackageId: wpId,
                requestedBy,
                worklogIds: JSON.stringify(worklogIds),
                reason,
                status: "PENDING"
            }
        });

        // 2. Notify administrators
        const admins = await prisma.user.findMany({
            where: {
                role: "ADMIN" // Or we could check for manage_reviews permission if we had a more complex role check here
            }
        });

        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            select: { name: true }
        });

        for (const admin of admins) {
            await createNotification(
                admin.id,
                "REVIEW_REQUEST_CREATED",
                "Nueva reclamación de horas",
                `El usuario ha solicitado revisar ${worklogIds.length} imputaciones en el WP ${wp?.name || wpId}.`,
                reviewRequest.id
            );
        }

        revalidatePath("/admin/review-requests");
        return { success: true, id: reviewRequest.id };
    } catch (error) {
        console.error("Error creating review request:", error);
        return { success: false, error: "Error al enviar la reclamación" };
    }
}

export async function getMyReviewRequests(userId: string) {
    try {
        return await prisma.reviewRequest.findMany({
            where: { requestedBy: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                workPackage: {
                    select: { name: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching my review requests:", error);
        return [];
    }
}

export async function getPendingReviewRequests() {
    try {
        return await prisma.reviewRequest.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: 'desc' },
            include: {
                requestedByUser: {
                    select: { name: true, surname: true }
                },
                workPackage: {
                    select: { name: true, clientName: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching pending review requests:", error);
        return [];
    }
}

export async function getReviewRequestsHistory() {
    try {
        return await prisma.reviewRequest.findMany({
            where: {
                status: {
                    in: ["APPROVED", "REJECTED"]
                }
            },
            orderBy: { reviewedAt: 'desc' },
            include: {
                requestedByUser: {
                    select: { name: true, surname: true }
                },
                reviewedByUser: {
                    select: { name: true, surname: true }
                },
                workPackage: {
                    select: { name: true, clientName: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching review requests history:", error);
        return [];
    }
}

export async function getReviewRequestDetail(id: string) {
    try {
        const request = await prisma.reviewRequest.findUnique({
            where: { id },
            include: {
                requestedByUser: {
                    select: { name: true, surname: true, email: true }
                },
                reviewedByUser: {
                    select: { name: true, surname: true }
                },
                workPackage: {
                    select: { name: true, clientName: true }
                }
            }
        });

        if (!request) return null;

        // Parse worklog IDs and fetch detail
        const worklogIds = JSON.parse(request.worklogIds) as number[];
        const worklogs = await prisma.worklogDetail.findMany({
            where: {
                id: { in: worklogIds }
            }
        });

        return { ...request, worklogs };
    } catch (error) {
        console.error("Error fetching review request detail:", error);
        return null;
    }
}

export async function approveReviewRequest(
    id: string,
    reviewedBy: string,
    notes: string,
    approvedWorklogIds: number[]
) {
    console.log(`[APPROVE_ACTION] Starting for ID: ${id}, By: ${reviewedBy}`);
    console.log(`[APPROVE_ACTION] Approved Worklogs:`, approvedWorklogIds);
    try {
        const currentRequest = await prisma.reviewRequest.findUnique({
            where: { id },
            include: { workPackage: true }
        });

        if (!currentRequest) {
            return { success: false, error: "Reclamación no encontrada" };
        }

        // 1. Update the review request status
        const request = await prisma.reviewRequest.update({
            where: { id },
            data: {
                status: "APPROVED",
                reviewedBy,
                reviewedAt: new Date(),
                reviewNotes: notes,
                approvedIds: JSON.stringify(approvedWorklogIds),
            }
        });

        // 2. Create the RETURN regularization if there are approved worklogs
        if (approvedWorklogIds.length > 0) {
            // Fetch the worklogs to calculate total hours
            const worklogs = await prisma.worklogDetail.findMany({
                where: {
                    id: { in: approvedWorklogIds }
                }
            });

            const totalHours = worklogs.reduce((sum, w) => sum + w.timeSpentHours, 0);

            if (totalHours > 0) {
                await prisma.regularization.create({
                    data: {
                        workPackageId: currentRequest.workPackageId,
                        date: new Date(),
                        type: "RETURN",
                        quantity: totalHours,
                        description: `Devolución de horas (Reclamación aprobada el ${new Date().toLocaleDateString('es-ES')})`,
                        note: notes
                    }
                });
            }
        }

        // 3. Notify the user
        await createNotification(
            request.requestedBy,
            "REVIEW_APPROVED",
            "Reclamación Aprobada",
            `Tu reclamación de horas ha sido aprobada. Se han devuelto ${approvedWorklogIds.length} imputaciones. Notas: ${notes}`,
            request.id
        );

        revalidatePath("/admin/review-requests");
        revalidatePath("/admin/regularizations");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL ERROR in approveReviewRequest:", error);
        return {
            success: false,
            error: `Error al aprobar: ${error.message || "Error desconocido"}`
        };
    }
}

export async function rejectReviewRequest(id: string, reviewedBy: string, notes: string) {
    console.log(`[REJECT_ACTION] Starting for ID: ${id}, By: ${reviewedBy}`);
    try {
        const request = await prisma.reviewRequest.update({
            where: { id },
            data: {
                status: "REJECTED",
                reviewedBy,
                reviewedAt: new Date(),
                reviewNotes: notes
            }
        });

        await createNotification(
            request.requestedBy,
            "REVIEW_REJECTED",
            "Reclamación Rechazada",
            `Tu reclamación de horas ha sido rechazada. Notas: ${notes}`,
            request.id
        );

        revalidatePath("/admin/review-requests");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL ERROR in rejectReviewRequest:", error);
        return {
            success: false,
            error: `Error al rechazar: ${error.message || "Error desconocido"}`
        };
    }
}
