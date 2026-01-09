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

import { sendEmail } from "@/lib/mail";

// Internal helper for other actions
export async function createNotification(
    type: string,
    data: Record<string, any>,
    relatedId?: string,
    clientId?: string,
    recipientId?: string
) {
    try {
        // Fetch the notification setting
        const setting = await prisma.notificationSetting.findUnique({
            where: { type }
        });

        if (!setting || !setting.isEnabled) {
            console.log(`[NOTIFICATIONS] Skipped ${type} as it is disabled or not found.`);
            return false;
        }

        let recipients: { id: string; email: string; name: string | null; role: string; }[] = [];

        if (recipientId) {
            const user = await prisma.user.findUnique({
                where: { id: recipientId },
                select: { id: true, email: true, name: true, role: true }
            });
            if (user) recipients.push(user);
        } else {
            // Determine recipients based on roles
            const roleNames = setting.roles.split(',').map(r => r.trim());

            // 1. All ADMINs (always receive unless roles setting excludes them)
            // 2. If it's a client notification, include specific manager and users of that client IF their roles match the setting

            let clientManagerId: string | undefined;
            if (clientId) {
                const client = await prisma.client.findUnique({
                    where: { id: clientId },
                    select: { manager: true }
                });
                clientManagerId = client?.manager || undefined;
            }

            const roleRecipients = await prisma.user.findMany({
                where: {
                    role: { in: roleNames },
                    OR: [
                        { role: 'ADMIN' },
                        ...(clientId ? [
                            { id: clientManagerId }, // Account manager
                            { clientId: clientId }    // Client users
                        ] : [])
                    ]
                },
                select: { id: true, email: true, name: true, role: true }
            });
            recipients.push(...roleRecipients);
        }

        // Remove duplicates if any (could happen if manager is also admin)
        const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.id, r])).values());

        // Filter if it's a client-specific notification and we have a relatedId
        // In some cases we might need to filter by clientId. 
        // For now, let's assume global by role unless specified.

        for (const user of uniqueRecipients) {
            // Process templates with dynamic data
            let appMsg = setting.appMessage || "";
            let emailSub = setting.emailSubject || setting.title;
            let emailMsg = setting.emailMessage || "";

            Object.entries(data).forEach(([key, val]) => {
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                appMsg = appMsg.replace(regex, String(val));
                emailSub = emailSub.replace(regex, String(val));
                emailMsg = emailMsg.replace(regex, String(val));
            });

            // Handle Hola {name}
            const userName = user.name || user.email.split('@')[0];
            emailMsg = emailMsg.replace(/{name}/g, userName);

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type,
                    title: setting.title,
                    message: appMsg,
                    relatedId
                }
            });

            // Send email if enabled
            if (setting.sendEmail && user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `${emailSub} - AM Manager`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #333;">${emailSub}</h2>
                            <p>Hola ${userName},</p>
                            <p>${emailMsg}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px;">Este es un aviso automático de AM Manager. Puedes gestionar tus notificaciones en la aplicación.</p>
                        </div>
                    `
                });
            }
        }

        return true;
    } catch (error) {
        console.error("Error creating notification:", error);
        return false;
    }
}

export async function getNotificationSettings() {
    try {
        // Seed some defaults if table is empty
        const count = await prisma.notificationSetting.count();
        if (count === 0) {
            await prisma.notificationSetting.createMany({
                data: [
                    { type: 'LOW_BALANCE', title: 'Balance Bajo', description: 'Notifica cuando un WP tiene < 10% de balance.', group: 'CONTRACTS', roles: 'ADMIN', appMessage: 'Al WP {wpName} le queda poco balance ({balance} {unit}).', emailSubject: '⚠️ Balance Bajo: {clientName}', emailMessage: 'El contrato {wpName} tiene un balance crítico de {balance} {unit}. Por favor, revisadlo.' },
                    { type: 'CONTRACT_RENEWED', title: 'Contrato Renovado', description: 'Notifica cuando un contrato ha sido renovado.', group: 'CONTRACTS', roles: 'ADMIN,GERENTE,COLABORADOR', appMessage: 'El contrato {wpName} se ha renovado hasta el {endDate}.', emailSubject: '✅ Contrato Renovado: {clientName}', emailMessage: 'Se ha formalizado la renovación de {wpName} hasta el {endDate}. Nuevas condiciones aplicadas.' },
                    { type: 'JIRA_USER_REQUEST_CREATED', title: 'Nueva Solicitud JIRA', description: 'Notifica solicitudes de usuarios JIRA.', group: 'SYSTEM', roles: 'ADMIN', appMessage: 'Nueva solicitud {type} de JIRA para {clientName}.', emailSubject: 'Solicitud JIRA: {clientName}', emailMessage: 'El cliente {clientName} ha solicitado una {type} de usuario JIRA.' }
                ]
            });
        }

        return await prisma.notificationSetting.findMany({
            orderBy: [{ group: 'asc' }, { title: 'asc' }]
        });
    } catch (error) {
        console.error("Error fetching notification settings:", error);
        return [];
    }
}

export async function updateNotificationSetting(id: string, data: {
    isEnabled?: boolean;
    sendEmail?: boolean;
    roles?: string;
    appMessage?: string;
    emailSubject?: string;
    emailMessage?: string;
}) {
    try {
        await prisma.notificationSetting.update({
            where: { id },
            data
        });
        revalidatePath("/admin/notifications");
        return { success: true };
    } catch (error) {
        console.error("Error updating notification setting:", error);
        return { success: false, error: "Error al actualizar configuración" };
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
                await createNotification('LOW_BALANCE', {
                    wpName: wp.name,
                    balance: balance.toFixed(1),
                    unit: candidate.unit,
                    clientName: wp.client.name
                }, wpId);
            }

            console.log(`[NOTIFICATIONS] Sent low balance notification for ${wp.name} to ${admins.length} admins.`);
        }
    } catch (error) {
        console.error("Error checking low balance notifications:", error);
    }
}

/**
 * Specialized notification for renewals
 */
export async function notifyRenewal(wpId: string, renewalMode: 'IPC' | 'NEW_CONDITIONS', extraData: Record<string, any>) {
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: { client: true }
        });

        if (!wp) return;

        // Prepare data for templates
        const data = {
            wpName: wp.name,
            clientName: wp.client.name,
            ...extraData
        };

        await createNotification('CONTRACT_RENEWED', data, wpId);
    } catch (error) {
        console.error("Error in notifyRenewal:", error);
    }
}
