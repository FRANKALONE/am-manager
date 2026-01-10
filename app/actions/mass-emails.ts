"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

export async function getEligibleRecipients(filters: {
    targetRoles?: string;
    targetClients?: string;
    targetWpTypes?: string;
}) {
    try {
        const conditions: any[] = [];

        // Filter by roles
        if (filters.targetRoles) {
            const roles = filters.targetRoles.split(',').map(r => r.trim());
            conditions.push({ role: { in: roles } });
        }

        // Filter by clients
        if (filters.targetClients) {
            const clientIds = filters.targetClients.split(',').map(c => c.trim());
            conditions.push({ clientId: { in: clientIds } });
        }

        // Filter by WP types - get users from clients that have WPs of specified types
        if (filters.targetWpTypes) {
            const wpTypes = filters.targetWpTypes.split(',').map(t => t.trim());

            // Find all clients that have work packages of these types
            const wps = await prisma.workPackage.findMany({
                where: { contractType: { in: wpTypes } },
                select: { clientId: true },
                distinct: ['clientId']
            });

            const clientIds = wps.map(wp => wp.clientId);
            if (clientIds.length > 0) {
                conditions.push({ clientId: { in: clientIds } });
            } else {
                // No clients with these WP types, return empty
                return [];
            }
        }

        // If no conditions, return empty (must have at least one filter)
        if (conditions.length === 0) {
            return [];
        }

        // Combine conditions with AND logic
        const users = await prisma.user.findMany({
            where: { AND: conditions },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                role: true,
                clientId: true,
                client: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { role: 'asc' },
                { name: 'asc' }
            ]
        });

        return users;
    } catch (error) {
        console.error("Error getting eligible recipients:", error);
        return [];
    }
}

export async function createMassEmail(data: {
    subject: string;
    htmlBody: string;
    targetRoles?: string;
    targetClients?: string;
    targetWpTypes?: string;
    selectedUserIds?: string[];
    createdBy: string;
    attachments?: any[];
}) {
    try {
        const massEmail = await prisma.massEmail.create({
            data: {
                subject: data.subject,
                htmlBody: data.htmlBody,
                targetRoles: data.targetRoles,
                targetClients: data.targetClients,
                targetWpTypes: data.targetWpTypes,
                createdBy: data.createdBy,
                attachments: data.attachments ? JSON.stringify(data.attachments) : null,
                status: 'DRAFT'
            }
        });

        // Get eligible recipients
        const recipients = await getEligibleRecipients({
            targetRoles: data.targetRoles,
            targetClients: data.targetClients,
            targetWpTypes: data.targetWpTypes
        });

        // Create recipient records
        if (recipients.length > 0) {
            // If selectedUserIds is provided, filter the recipients
            const finalRecipients = data.selectedUserIds
                ? recipients.filter(r => data.selectedUserIds?.includes(r.id))
                : recipients;

            if (finalRecipients.length > 0) {
                await prisma.massEmailRecipient.createMany({
                    data: finalRecipients.map(user => ({
                        massEmailId: massEmail.id,
                        userId: user.id
                    }))
                });
            }
        }

        revalidatePath('/admin/mass-emails');
        return { success: true, id: massEmail.id, recipientCount: recipients.length };
    } catch (error) {
        console.error("Error creating mass email:", error);
        return { success: false, error: "Error al crear el email masivo" };
    }
}

export async function updateMassEmail(id: string, data: {
    subject?: string;
    htmlBody?: string;
    targetRoles?: string;
    targetClients?: string;
    targetWpTypes?: string;
    selectedUserIds?: string[];
    attachments?: any[];
}) {
    try {
        await prisma.massEmail.update({
            where: { id },
            data: {
                ...data,
                attachments: data.attachments ? JSON.stringify(data.attachments) : undefined
            }
        });

        // If filters changed, update recipients
        if (data.targetRoles !== undefined || data.targetClients !== undefined || data.targetWpTypes !== undefined) {
            const massEmail = await prisma.massEmail.findUnique({
                where: { id },
                select: {
                    targetRoles: true,
                    targetClients: true,
                    targetWpTypes: true
                }
            });

            if (massEmail) {
                // Delete existing recipients
                await prisma.massEmailRecipient.deleteMany({
                    where: { massEmailId: id }
                });

                // Get new recipients
                const recipients = await getEligibleRecipients({
                    targetRoles: massEmail.targetRoles || undefined,
                    targetClients: massEmail.targetClients || undefined,
                    targetWpTypes: massEmail.targetWpTypes || undefined
                });

                // Create new recipient records
                if (recipients.length > 0) {
                    // If selectedUserIds is provided, filter the recipients
                    const finalRecipients = data.selectedUserIds
                        ? recipients.filter(r => data.selectedUserIds?.includes(r.id))
                        : recipients;

                    if (finalRecipients.length > 0) {
                        await prisma.massEmailRecipient.createMany({
                            data: finalRecipients.map(user => ({
                                massEmailId: id,
                                userId: user.id
                            }))
                        });
                    }
                }
            }
        }

        revalidatePath('/admin/mass-emails');
        return { success: true };
    } catch (error) {
        console.error("Error updating mass email:", error);
        return { success: false, error: "Error al actualizar el email" };
    }
}

export async function deleteMassEmail(id: string) {
    try {
        await prisma.massEmail.delete({
            where: { id }
        });

        revalidatePath('/admin/mass-emails');
        return { success: true };
    } catch (error) {
        console.error("Error deleting mass email:", error);
        return { success: false, error: "Error al eliminar el email" };
    }
}

export async function sendMassEmail(id: string) {
    try {
        const massEmail = await prisma.massEmail.findUnique({
            where: { id },
            include: {
                recipients: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                surname: true,
                                email: true
                            }
                        }
                    },
                    where: {
                        sentAt: null // Only unsent
                    }
                }
            }
        });

        if (!massEmail) {
            return { success: false, error: "Email no encontrado" };
        }

        if (massEmail.status === 'SENT') {
            return { success: false, error: "Este email ya ha sido enviado" };
        }

        let successCount = 0;
        let errorCount = 0;

        // Send to each recipient
        for (const recipient of massEmail.recipients) {
            try {
                const userName = recipient.user.name + (recipient.user.surname ? ' ' + recipient.user.surname : '');

                // Parse attachments if any
                const massEmailAttachments = massEmail.attachments ? JSON.parse(massEmail.attachments) : [];
                const nodemailerAttachments = [
                    {
                        filename: 'logo-altim.png',
                        path: './public/logo-altim.png',
                        cid: 'altimlogo'
                    },
                    ...massEmailAttachments.map((att: any) => ({
                        filename: att.name,
                        path: att.url // This should be the URL from Vercel Blob
                    }))
                ];

                // Replace {name} placeholder if exists
                let personalizedBody = massEmail.htmlBody.replace(/{name}/g, userName);

                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

                await sendEmail({
                    to: recipient.user.email,
                    subject: massEmail.subject,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; color: #333;">
                            <div style="margin-bottom: 20px;">
                                ${personalizedBody}
                            </div>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <p style="color: #666; font-size: 13px; margin: 0;">
                                            Este es un email de <strong>Manager AM de altim</strong>.
                                        </p>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle;">
                                        <img src="cid:altimlogo" alt="Altim Logo" style="height: 30px; width: auto;">
                                    </td>
                                </tr>
                            </table>
                            ${baseUrl ? `<img src="${baseUrl}/api/track/email/open/${recipient.id}" width="1" height="1" style="display:none;" />` : ''}
                        </div>
                    `,
                    attachments: nodemailerAttachments
                });

                // Mark as sent
                await prisma.massEmailRecipient.update({
                    where: { id: recipient.id },
                    data: { sentAt: new Date() }
                });

                successCount++;
            } catch (error) {
                console.error(`Error sending to ${recipient.user.email}:`, error);
                errorCount++;
            }
        }

        // Update mass email status
        await prisma.massEmail.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: new Date()
            }
        });

        revalidatePath('/admin/mass-emails');
        return {
            success: true,
            sent: successCount,
            errors: errorCount,
            total: massEmail.recipients.length
        };
    } catch (error) {
        console.error("Error sending mass email:", error);
        return { success: false, error: "Error al enviar el email masivo" };
    }
}

export async function scheduleMassEmail(id: string, scheduledFor: Date) {
    try {
        await prisma.massEmail.update({
            where: { id },
            data: {
                status: 'SCHEDULED',
                scheduledFor
            }
        });

        revalidatePath('/admin/mass-emails');
        return { success: true };
    } catch (error) {
        console.error("Error scheduling mass email:", error);
        return { success: false, error: "Error al programar el email" };
    }
}

export async function getMassEmails() {
    try {
        const emails = await prisma.massEmail.findMany({
            include: {
                creator: {
                    select: {
                        name: true,
                        surname: true
                    }
                },
                recipients: {
                    select: {
                        id: true,
                        userId: true,
                        sentAt: true,
                        openedAt: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return emails.map(email => ({
            ...email,
            totalRecipients: email.recipients.length,
            sentCount: email.recipients.filter(r => r.sentAt).length,
            openedCount: email.recipients.filter(r => r.openedAt).length,
            openRate: email.recipients.length > 0
                ? Math.round((email.recipients.filter(r => r.openedAt).length / email.recipients.length) * 100)
                : 0
        }));
    } catch (error) {
        console.error("Error getting mass emails:", error);
        return [];
    }
}

export async function getMassEmailStats(id: string) {
    try {
        const massEmail = await prisma.massEmail.findUnique({
            where: { id },
            include: {
                recipients: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                surname: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });

        if (!massEmail) return null;

        return {
            ...massEmail,
            stats: {
                total: massEmail.recipients.length,
                sent: massEmail.recipients.filter(r => r.sentAt).length,
                opened: massEmail.recipients.filter(r => r.openedAt).length,
                clicked: massEmail.recipients.filter(r => r.clickedAt).length,
                openRate: massEmail.recipients.length > 0
                    ? Math.round((massEmail.recipients.filter(r => r.openedAt).length / massEmail.recipients.length) * 100)
                    : 0,
                clickRate: massEmail.recipients.length > 0
                    ? Math.round((massEmail.recipients.filter(r => r.clickedAt).length / massEmail.recipients.length) * 100)
                    : 0
            },
            recipients: massEmail.recipients.map(r => ({
                id: r.id,
                user: r.user,
                sentAt: r.sentAt,
                openedAt: r.openedAt,
                clickedAt: r.clickedAt
            }))
        };
    } catch (error) {
        console.error("Error getting mass email stats:", error);
        return null;
    }
}
