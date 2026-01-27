"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";
import { getVisibilityFilter, canAccessClient, hasPermission } from "@/lib/auth";

export async function getClientProducts(filters?: { clientId?: string; productType?: string }) {
    try {
        const filter = await getVisibilityFilter();
        const where: any = {};

        if (filters?.clientId) {
            where.clientId = filters.clientId;
        }

        if (filters?.productType) {
            where.productType = filters.productType;
        }

        if (!filter.isGlobal) {
            where.OR = [];
            if (filter.clientIds) {
                where.OR.push({ clientId: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.OR.push({ client: { manager: filter.managerId } });
            }
            if (where.OR.length === 0 && !filters?.clientId) return [];
        }

        const products = await prisma.clientProduct.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                client: {
                    select: { name: true }
                }
            }
        });
        return products;
    } catch (error) {
        console.error("Failed to fetch client products:", error);
        return [];
    }
}

export async function createClientProduct(prevState: any, formData: FormData) {
    const clientId = formData.get("clientId") as string;
    const productType = formData.get("productType") as string;
    const status = formData.get("status") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const notes = formData.get("notes") as string;

    if (!await hasPermission("manage_clients")) {
        return { error: "No tienes permisos para realizar esta acción" };
    }

    if (!clientId || !productType || !startDateStr) {
        const { t } = await getTranslations();
        return { error: t('errors.required', { field: "Campos obligatorios" }) };
    }

    const customAttributes: any = {};
    formData.forEach((value, key) => {
        if (key.startsWith("custom_")) {
            customAttributes[key.replace("custom_", "")] = value;
        }
    });

    try {
        await prisma.clientProduct.create({
            data: {
                clientId,
                productType,
                status: status || "ACTIVE",
                startDate: new Date(startDateStr),
                endDate: endDateStr ? new Date(endDateStr) : null,
                notes: notes || null,
                customAttributes: Object.keys(customAttributes).length > 0 ? JSON.stringify(customAttributes) : null,
            },
        });
    } catch (error) {
        console.error("Error creating client product:", error);
        return { error: "Error al crear el producto" };
    }

    revalidatePath("/admin/products");
    redirect("/admin/products");
}

export async function updateClientProduct(id: string, prevState: any, formData: FormData) {
    const productType = formData.get("productType") as string;
    const status = formData.get("status") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const notes = formData.get("notes") as string;

    const product = await prisma.clientProduct.findUnique({ where: { id } });
    if (!product) return { error: "Producto no encontrado" };

    if (!await hasPermission("manage_clients") || !await canAccessClient(product.clientId)) {
        return { error: "No autorizado" };
    }

    const customAttributes: any = {};
    formData.forEach((value, key) => {
        if (key.startsWith("custom_")) {
            customAttributes[key.replace("custom_", "")] = value;
        }
    });

    try {
        await prisma.clientProduct.update({
            where: { id },
            data: {
                productType,
                status,
                startDate: new Date(startDateStr),
                endDate: endDateStr ? new Date(endDateStr) : null,
                notes: notes || null,
                customAttributes: Object.keys(customAttributes).length > 0 ? JSON.stringify(customAttributes) : null,
            },
        });
    } catch (error) {
        console.error("Error updating client product:", error);
        return { error: "Error al actualizar el producto" };
    }

    revalidatePath("/admin/products");
    redirect("/admin/products");
}

export async function deleteClientProduct(id: string) {
    const product = await prisma.clientProduct.findUnique({ where: { id } });
    if (!product) return { error: "Producto no encontrado" };

    if (!await hasPermission("manage_clients") || !await canAccessClient(product.clientId)) {
        return { error: "No autorizado" };
    }

    try {
        await prisma.clientProduct.delete({
            where: { id }
        });
        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Error deleting client product:", error);
        return { success: false, error: "Error al eliminar el producto" };
    }
}
