"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { getTranslations } from "@/lib/get-translations";
import { getVisibilityFilter, canAccessClient } from "@/lib/auth";

export async function createJiraUserRequest(data: {
    clientId: string;
    requestedBy: string;
    type: 'CREATE' | 'DELETE';
    email?: string;
    displayName?: string;
    jiraAccountId?: string;
    reason?: string;
}) {
    if (!await canAccessClient(data.clientId)) {
        return { success: false, error: "No autorizado para este cliente" };
    }
    try {
        const request = await prisma.jiraUserRequest.create({
            data: {
                clientId: data.clientId,
                requestedBy: data.requestedBy,
                type: data.type,
                status: "PENDING",
                email: data.email,
                displayName: data.displayName,
                jiraAccountId: data.jiraAccountId,
                reason: data.reason,
            }
        });

        // Notify admins
        try {
            // Get client name for the message
            const client = await prisma.client.findUnique({
                where: { id: data.clientId },
                select: { name: true }
            });

            await createNotification(
                "JIRA_USER_REQUEST_CREATED",
                {
                    type: data.type === 'CREATE' ? 'Creación' : 'Eliminación',
                    clientName: client?.name || data.clientId
                },
                request.id,
                data.clientId
            );
        } catch (notifyError) {
            console.error("Error notifying admins about JIRA request:", notifyError);
        }

        revalidatePath("/admin/jira-requests");
        return { success: true, id: request.id };
    } catch (error: any) {
        console.error("Error creating JIRA user request:", error);
        return { success: false, error: `Error al crear la solicitud: ${error.message || "Unknown"}` };
    }
}

export async function getPendingJiraUserRequests() {
    try {
        const filter = await getVisibilityFilter();
        const where: any = { status: "PENDING" };

        if (!filter.isGlobal) {
            where.client = {
                OR: []
            };
            if (filter.clientIds) {
                where.client.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.client.OR.push({ manager: filter.managerId });
            }
            if (where.client.OR.length === 0) return [];
        }

        return await prisma.jiraUserRequest.findMany({
            where,
            include: {
                requestedByUser: {
                    select: { name: true, surname: true }
                },
                client: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching pending JIRA user requests:", error);
        return [];
    }
}

export async function getJiraUserRequestsHistory() {
    try {
        const filter = await getVisibilityFilter();
        const where: any = {
            status: { in: ["APPROVED", "REJECTED"] }
        };

        if (!filter.isGlobal) {
            where.client = {
                OR: []
            };
            if (filter.clientIds) {
                where.client.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.client.OR.push({ manager: filter.managerId });
            }
            if (where.client.OR.length === 0) return [];
        }

        return await prisma.jiraUserRequest.findMany({
            where,
            include: {
                requestedByUser: {
                    select: { name: true, surname: true }
                },
                reviewedByUser: {
                    select: { name: true, surname: true }
                },
                client: {
                    select: { name: true }
                }
            },
            orderBy: { reviewedAt: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching JIRA user requests history:", error);
        return [];
    }
}

export async function handleJiraUserRequest(
    id: string,
    reviewedBy: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
) {
    try {
        const checkRequest = await prisma.jiraUserRequest.findUnique({
            where: { id },
            select: { clientId: true }
        });

        if (!checkRequest || !await canAccessClient(checkRequest.clientId)) {
            return { success: false, error: "No autorizado" };
        }

        const request = await prisma.jiraUserRequest.update({
            where: { id },
            data: {
                status,
                reviewedBy,
                reviewedAt: new Date(),
                reviewNotes: notes
            },
            include: {
                client: true
            }
        });

        // Notify the requester
        try {
            const type = status === 'APPROVED' ? 'JIRA_USER_REQUEST_APPROVED' : 'JIRA_USER_REQUEST_REJECTED';
            await createNotification(
                type,
                { notes: notes || '' },
                request.id,
                request.clientId,
                request.requestedBy
            );
        } catch (notifyError) {
            console.error("Error notifying requester about JIRA request status:", notifyError);
        }

        if (status === 'APPROVED') {
            try {
                const { syncClientJiraUsers } = await import("./jira-customers");
                await syncClientJiraUsers(request.clientId);
            } catch (syncError) {
                console.error("Error triggering sync after approval:", syncError);
            }
        }

        revalidatePath("/admin/jira-requests");
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error) {
        console.error("Error handling JIRA user request:", error);
        return { success: false, error: "Error al procesar la solicitud" };
    }
}
