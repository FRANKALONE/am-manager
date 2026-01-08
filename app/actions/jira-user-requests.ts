"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { getTranslations } from "@/lib/get-translations";

export async function createJiraUserRequest(data: {
    clientId: string;
    requestedBy: string;
    type: 'CREATE' | 'DELETE';
    email?: string;
    displayName?: string;
    jiraAccountId?: string;
    reason?: string;
}) {
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
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN" }
        });

        const { t } = await getTranslations();

        for (const admin of admins) {
            await createNotification(
                admin.id,
                "JIRA_USER_REQUEST_CREATED",
                t('notifications.titles.jiraUserRequestCreated'),
                t('notifications.messages.jiraUserRequestCreated', { type: data.type, client: data.clientId }),
                request.id
            );
        }

        revalidatePath("/admin/jira-requests");
        return { success: true, id: request.id };
    } catch (error) {
        console.error("Error creating JIRA user request:", error);
        return { success: false, error: "Error al crear la solicitud" };
    }
}

export async function getPendingJiraUserRequests() {
    try {
        return await prisma.jiraUserRequest.findMany({
            where: { status: "PENDING" },
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
        return await prisma.jiraUserRequest.findMany({
            where: {
                status: { in: ["APPROVED", "REJECTED"] }
            },
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

        const { t } = await getTranslations();

        // Notify the requester
        const type = status === 'APPROVED' ? 'JIRA_USER_REQUEST_APPROVED' : 'JIRA_USER_REQUEST_REJECTED';
        const title = status === 'APPROVED' ? t('notifications.titles.jiraUserRequestApproved') : t('notifications.titles.jiraUserRequestRejected');
        const message = status === 'APPROVED'
            ? t('notifications.messages.jiraUserRequestApproved', { notes: notes || '' })
            : t('notifications.messages.jiraUserRequestRejected', { notes: notes || '' });

        await createNotification(
            request.requestedBy,
            type,
            title,
            message,
            request.id
        );

        // If approved and creation, maybe trigger sync? 
        // The user said: "Y se debería sincronizar auto ese cliente para actulaizar los usuarios de jira en su pool."
        if (status === 'APPROVED') {
            // Trigger sync for this client
            try {
                // We'll call the existing sync route or action if possible
                // For now, we'll assume the admin performs the action in JIRA and then confirms here.
                // The user said: "cuando el administrador ejecute esto en JIRA y el admin confirme esta tarea en la web..."
                // So the sync should happen AFTER the admin clicks "Aprobar" (which means they already did it in JIRA)

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
