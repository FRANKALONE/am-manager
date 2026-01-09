"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";

import { getVisibilityFilter, canAccessClient } from "@/lib/auth";

export async function getClients() {
    try {
        const filter = await getVisibilityFilter();
        const where: any = {};

        if (!filter.isGlobal) {
            where.OR = [];
            if (filter.clientIds) {
                where.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.OR.push({ manager: filter.managerId });
            }
            if (where.OR.length === 0) return [];
        }

        const clients = await prisma.client.findMany({
            where,
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { workPackages: true },
                },
            },
        });
        return clients;
    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return [];
    }
}

export async function getClientById(id: string) {
    if (!await canAccessClient(id)) return null;
    try {
        return await prisma.client.findUnique({
            where: { id },
            include: { users: true }
        });
    } catch (error) {
        return null;
    }
}

export async function createClient(prevState: any, formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const manager = formData.get("manager") as string;
    const amOnboardingDateStr = formData.get("amOnboardingDate") as string;
    const clientPortalUrl = formData.get("clientPortalUrl") as string;
    const reportEmailsManual = formData.get("reportEmails") as string;
    const selectedUsersEmails = formData.getAll("selectedReportEmails") as string[];
    const clientLogo = formData.get("clientLogo") as string;

    // Combine emails
    const allEmails = [
        ...selectedUsersEmails,
        ...(reportEmailsManual ? reportEmailsManual.split(',').map(e => e.trim()).filter(e => e !== "") : [])
    ];
    const reportEmails = Array.from(new Set(allEmails)).join(', ');

    // Custom Attributes Handling
    const customAttributes: Record<string, any> = {};
    Array.from(formData.entries()).forEach(([key, value]) => {
        if (key.startsWith("custom_")) {
            const fieldName = key.replace("custom_", "");
            customAttributes[fieldName] = value;
        }
    });

    if (!id || id.length > 10) {
        const { t } = await getTranslations();
        return { error: t('errors.maxLength', { field: 'ID', count: 10 }) };
    }
    if (!name) {
        const { t } = await getTranslations();
        return { error: t('errors.required', { field: t('common.name') }) };
    }

    try {
        await prisma.client.create({
            data: {
                id,
                name,
                manager: manager || null,
                amOnboardingDate: amOnboardingDateStr ? new Date(amOnboardingDateStr) : null,
                clientPortalUrl: clientPortalUrl || null,
                reportEmails: reportEmails || null,
                clientLogo: clientLogo || null,
                customAttributes: JSON.stringify(customAttributes),
            },
        });
    } catch (error) {
        console.error(error);
        const { t } = await getTranslations();
        return { error: t('errors.alreadyExists', { item: t('clients.title') }) };
    }

    revalidatePath("/admin/clients");
    redirect("/admin/clients");
}

export async function updateClient(id: string, prevState: any, formData: FormData) {
    if (!await canAccessClient(id)) {
        return { error: "No autorizado para este cliente" };
    }
    const name = formData.get("name") as string;
    const manager = formData.get("manager") as string;
    const amOnboardingDateStr = formData.get("amOnboardingDate") as string;
    const clientPortalUrl = formData.get("clientPortalUrl") as string;
    const reportEmailsManual = formData.get("reportEmails") as string;
    const selectedUsersEmails = formData.getAll("selectedReportEmails") as string[];
    const clientLogo = formData.get("clientLogo") as string;

    // Combine emails
    const allEmails = [
        ...selectedUsersEmails,
        ...(reportEmailsManual ? reportEmailsManual.split(',').map(e => e.trim()).filter(e => e !== "") : [])
    ];
    const reportEmails = Array.from(new Set(allEmails)).join(', ');

    // Custom Attributes Handling
    const customAttributes: Record<string, any> = {};
    Array.from(formData.entries()).forEach(([key, value]) => {
        if (key.startsWith("custom_")) {
            const fieldName = key.replace("custom_", "");
            customAttributes[fieldName] = value;
        }
    });

    if (!name) {
        const { t } = await getTranslations();
        return { error: t('errors.required', { field: t('common.name') }) };
    }

    try {
        await prisma.client.update({
            where: { id },
            data: {
                name,
                manager: manager || null,
                amOnboardingDate: amOnboardingDateStr ? new Date(amOnboardingDateStr) : null,
                clientPortalUrl: clientPortalUrl || null,
                reportEmails: reportEmails || null,
                clientLogo: clientLogo || null,
                customAttributes: JSON.stringify(customAttributes),
            },
        });
    } catch (error) {
        console.error("Error updating client:", error);
        const { t } = await getTranslations();
        return { error: t('errors.updateError', { item: t('clients.title') }) };
    }

    revalidatePath("/admin/clients");
    redirect("/admin/clients");
}

export async function deleteClient(id: string) {
    if (!await canAccessClient(id)) {
        return { success: false, error: "No autorizado" };
    }
    try {
        await prisma.client.delete({
            where: { id }
        });
        revalidatePath("/admin/clients");
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('clients.title') }) };
    }
}
