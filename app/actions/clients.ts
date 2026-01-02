"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getClients() {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { workPackages: true }, // Updated from projects to workPackages
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
        return { error: "ID es obligatorio y máx 10 caracteres" };
    }
    if (!name) {
        return { error: "Nombre es obligatorio" };
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
        return { error: "Error al crear cliente. Puede que el ID ya exista." };
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
        return { error: "Nombre es obligatorio" };
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
        return { error: "Error al actualizar cliente" };
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
        return { success: false, error: "Error al eliminar cliente" };
    }
}
