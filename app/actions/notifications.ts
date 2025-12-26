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

export async function checkLowBalanceNotifications(wpId: string) {
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                validityPeriods: {
                    orderBy: { startDate: 'desc' },
                    take: 1
                },
                client: true
            }
        });

        if (!wp) return;

        const period = wp.validityPeriods[0];
        if (!period) return;

        // Condition: BOLSA + PUNTUAL + BAJO_PEDIDO (regularization type)
        const isBolsaPuntual = wp.contractType?.toUpperCase() === 'BOLSA' && wp.billingType?.toUpperCase() === 'PUNTUAL';
        const isBajoPedido = period.regularizationType?.toUpperCase() === 'BAJO_PEDIDO';

        if (!isBolsaPuntual || !isBajoPedido) return;

        // Calculate current balance (this is a simplified version of closure logic, 
        // ideally we would reuse the balance calculation from cierres.ts but for performance we might check accumulatedHours)
        // However, the requested rule is: "cuando al cliente le quede en el acumulado menos del 10% de las horas que tenía contratadas"

        // We'll use the accumulated balance logic from cierres.ts (simplified for the current period)
        const totalContractedValue = period.totalQuantity || 0;
        if (totalContractedValue <= 0) return;

        // To get the real balance, we need the logic from cierres.ts. 
        // Since we are inside a server action, let's call getPendingCierres for this specific WP or just calculate it here.
        // Actually, getPendingCierres is exported from cierres.ts.
        const { getPendingCierres } = await import("./cierres");
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const { candidates } = await getPendingCierres(month, year);

        const candidate = candidates.find(c => c.wpId === wpId);
        if (!candidate) return;

        const balance = candidate.accumulatedBalance;
        const threshold = 0.1 * totalContractedValue;

        if (balance < threshold && balance >= 0) {
            // Check if we already notified this month for this WP
            const startOfMonth = new Date(year, month - 1, 1);
            const existingNotification = await prisma.notification.findFirst({
                where: {
                    type: 'LOW_BALANCE',
                    relatedId: wpId,
                    createdAt: { gte: startOfMonth }
                }
            });

            if (existingNotification) return;

            // Notify all ADMINs
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' }
            });

            const title = `⚠️ Renovación / PO Pendiente: ${wp.client.name}`;
            const message = `Al WP "${wp.name}" le quedan ${balance.toFixed(1)} ${candidate.unit} de las ${totalContractedValue.toFixed(1)} contratadas (menos del 10%). Por favor, gestionad la renovación o el PO con el cliente.`;

            for (const admin of admins) {
                await createNotification(admin.id, 'LOW_BALANCE', title, message, wpId);
            }

            console.log(`[NOTIFICATIONS] Sent low balance notification for ${wp.name} to ${admins.length} admins.`);
        }
    } catch (error) {
        console.error("Error checking low balance notifications:", error);
    }
}
