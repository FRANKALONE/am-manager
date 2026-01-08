"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";

export async function getClients(managerId?: string) {
    try {
        const { cookies } = await import("next/headers");
        const { getPermissionsByRoleName } = await import("@/lib/permissions");

        const userRole = cookies().get("user_role")?.value || "";
        const perms = await getPermissionsByRoleName(userRole);

        const where: any = {};
        if (managerId && !perms.view_all_clients) {
            where.manager = managerId;
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
