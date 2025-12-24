"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getMyNotifications(userId: string) {
    try {
        return await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function getUnreadNotificationsCount(userId: string) {
    try {
        return await prisma.notification.count({
            where: {
                userId,
                isRead: false
            }
        });
    } catch (error) {
        console.error("Error counting unread notifications:", error);
        return 0;
    }
}

export async function markNotificationAsRead(id: string) {
    try {
        await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return { success: false, error: "Error al marcar como leída" };
    }
}

export async function markAllNotificationsAsRead(userId: string) {
    try {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return { success: false, error: "Error al marcar todas como leídas" };
    }
}

// Internal helper for other actions
export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedId?: string
) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                relatedId
            }
        });
        return true;
    } catch (error) {
        console.error("Error creating notification:", error);
        return false;
    }
}
