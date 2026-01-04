"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { getTranslations } from "@/lib/get-translations";

export async function createReviewRequest(
    wpId: string,
    requestedBy: string,
    worklogs: any[],
    reason: string
) {
    try {
        console.log('[DEBUG] Creating review request with worklog snapshots:', worklogs.length);

        // Create the review request storing the full snapshot
        const reviewRequest = await prisma.reviewRequest.create({
            data: {
                workPackageId: wpId,
                requestedBy,
                worklogIds: JSON.stringify(worklogs),
                reason,
                status: "PENDING"
            }
        });

        console.log('[DEBUG] Review request created:', reviewRequest.id);

        // Notify administrators
        const admins = await prisma.user.findMany({
            where: {
                role: "ADMIN"
            }
        });

        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            select: { name: true }
        });

        const { t } = await getTranslations();

        for (const admin of admins) {
            await createNotification(
                admin.id,
                "REVIEW_REQUEST_CREATED",
                t('notifications.titles.reviewCreated'),
                t('notifications.messages.reviewCreated', { count: worklogs.length, wp: wp?.name || wpId }),
                reviewRequest.id
            );
        }

        // Notify Manager if assigned
        const wpFull = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: { client: true }
        });
        const managerId = wpFull?.client.manager;
        if (managerId && !admins.some(a => a.id === managerId)) {
            const { t } = await getTranslations();
            await createNotification(
                managerId,
                "REVIEW_REQUEST_CREATED",
                t('notifications.titles.reviewCreatedAssigned'),
                t('notifications.messages.reviewCreatedAssigned', { count: worklogs.length, wp: wp?.name || wpId }),
                reviewRequest.id
            );
        }

        revalidatePath("/admin/review-requests");
        return { success: true, id: reviewRequest.id };
    } catch (error) {
        console.error("Error creating review request:", error);
        const { t } = await getTranslations();
        return { success: false, error: t('errors.claimError') };
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
                    select: { name: true, clientName: true, client: { select: { manager: true } } }
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
                    select: { name: true, clientName: true, client: { select: { manager: true } } }
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

        // Parse worklog storage (could be IDs or full objects)
        const storedData = JSON.parse(request.worklogIds);
        let worklogs = [];

        if (Array.isArray(storedData) && storedData.length > 0) {
            if (typeof storedData[0] === 'object') {
                // If we have full objects, use them as the base
                worklogs = storedData;

                // Optional: try to refresh them from DB if they still exist (for latest metadata)
                const currentIds = worklogs.map((w: any) => w.id).filter(Boolean);
                if (currentIds.length > 0) {
                    const dbWorklogs = await prisma.worklogDetail.findMany({
                        where: { id: { in: currentIds } }
                    });

                    // Replace with DB data if found, but keep snapshot for missing ones
                    const dbMap = new Map(dbWorklogs.map(w => [w.id, w]));
                    worklogs = worklogs.map((w: any) => dbMap.get(w.id) || w);
                }
            } else {
                // Legacy format: just IDs
                worklogs = await prisma.worklogDetail.findMany({
                    where: { id: { in: storedData as number[] } }
                });
            }
        }

        console.log('[DEBUG] Displaying', worklogs.length, 'worklogs for request', id);

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
            const { t } = await getTranslations();
            return { success: false, error: t('errors.notFound', { item: t('admin.settings.claims') }) };
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
            // Parse the stored data (could be full objects or IDs)
            let worklogs: any[] = [];
            const storedData = JSON.parse(currentRequest.worklogIds);

            if (Array.isArray(storedData) && storedData.length > 0 && typeof storedData[0] === 'object') {
                // We have snapshots! Use them for the approved ones
                const snapshotMap = new Map(storedData.map((w: any) => [w.id, w]));
                worklogs = approvedWorklogIds.map(id => snapshotMap.get(id)).filter(Boolean);
            } else {
                // Legacy: fetch from DB
                worklogs = await prisma.worklogDetail.findMany({
                    where: {
                        id: { in: approvedWorklogIds }
                    },
                    orderBy: { startDate: 'asc' }
                });
            }

            const totalHours = worklogs.reduce((sum, w) => sum + w.timeSpentHours, 0);

            if (totalHours > 0) {
                // Use the date of the first worklog (earliest) for the regularization
                const regularizationDate = worklogs.length > 0
                    ? new Date(worklogs[0].startDate)
                    : new Date();

                // Get unique ticket IDs for the description
                const ticketIds = Array.from(new Set(worklogs.map(w => w.issueKey).filter(Boolean)));
                const ticketsText = ticketIds.length > 0 ? ` (Tickets: ${ticketIds.join(', ')})` : '';

                const { t } = await getTranslations();
                await prisma.regularization.create({
                    data: {
                        workPackageId: currentRequest.workPackageId,
                        date: regularizationDate,
                        type: "RETURN",
                        quantity: totalHours,
                        description: `${t('regularizations.types.return')}${ticketsText}`,
                        note: notes
                    }
                });
            }
        }

        const { t } = await getTranslations();
        // 3. Notify the user
        await createNotification(
            request.requestedBy,
            "REVIEW_APPROVED",
            t('notifications.titles.reviewApproved'),
            t('notifications.messages.reviewApproved', { count: approvedWorklogIds.length, notes }),
            request.id
        );

        if (currentRequest.workPackage.clientId) {
            const client = await prisma.client.findUnique({ where: { id: currentRequest.workPackage.clientId } });
            if (client?.manager) {
                const { t } = await getTranslations();
                await createNotification(
                    client.manager,
                    "REVIEW_DECIDED",
                    t('notifications.titles.reviewDecidedApproved'),
                    t('notifications.messages.reviewDecidedApproved', { wp: currentRequest.workPackage.name, notes }),
                    request.id
                );
            }
        }

        revalidatePath("/admin/review-requests");
        revalidatePath("/admin/regularizations");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL ERROR in approveReviewRequest:", error);
        const { t } = await getTranslations();
        return {
            success: false,
            error: `${t('errors.updateError', { item: t('admin.settings.claims') })}: ${error.message || t('errors.unknown')}`
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

        const { t } = await getTranslations();
        await createNotification(
            request.requestedBy,
            "REVIEW_REJECTED",
            t('notifications.titles.reviewRejected'),
            t('notifications.messages.reviewRejected', { notes }),
            request.id
        );

        // Notify Manager of the decision
        const wp = await prisma.workPackage.findFirst({
            where: { reviewRequests: { some: { id } } },
            include: { client: true }
        });
        if (wp?.client.manager) {
            const { t } = await getTranslations();
            await createNotification(
                wp.client.manager,
                "REVIEW_DECIDED",
                t('notifications.titles.reviewDecidedRejected'),
                t('notifications.messages.reviewDecidedRejected', { wp: wp.name, notes }),
                request.id
            );
        }

        revalidatePath("/admin/review-requests");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL ERROR in rejectReviewRequest:", error);
        const { t } = await getTranslations();
        return {
            success: false,
            error: `${t('errors.updateError', { item: t('admin.settings.claims') })}: ${error.message || t('errors.unknown')}`
        };
    }
}

export async function deleteReviewRequest(id: string) {
    try {
        await prisma.reviewRequest.delete({
            where: { id }
        });
        revalidatePath("/admin/review-requests");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting review request:", error);
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('admin.settings.claims') }) };
    }
}
