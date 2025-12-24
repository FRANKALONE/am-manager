"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- EXPORT REGULARIZATIONS ---

export async function exportRegularizations() {
    try {
        const regularizations = await prisma.regularization.findMany({
            include: {
                workPackage: {
                    include: {
                        client: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        const csvRows = [];
        // Header
        csvRows.push([
            "ID", "Fecha", "ClienteID", "ClienteNombre", "WorkPackageID", "WorkPackageNombre",
            "Tipo", "Cantidad", "Descripcion", "TicketID", "Nota"
        ].join(";"));

        for (const reg of regularizations) {
            const date = new Date(reg.date).toISOString().split('T')[0];

            csvRows.push([
                reg.id.toString(),
                date,
                reg.workPackage.client.id,
                reg.workPackage.client.name,
                reg.workPackage.id,
                reg.workPackage.name,
                reg.type,
                reg.quantity.toString(),
                reg.description || "",
                reg.ticketId || "",
                reg.note || ""
            ].join(";"));
        }

        return csvRows.join("\n");

    } catch (error) {
        console.error("Export regularizations failed:", error);
        throw new Error("Failed to export regularizations");
    }
}

// --- IMPORT REGULARIZATIONS ---

export async function importRegularizations(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) return { error: "No se ha subido ningún archivo" };

    const buffer = await file.arrayBuffer();
    let text = "";

    try {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        text = decoder.decode(buffer);
    } catch (e) {
        console.warn("UTF-8 decode failed, falling back to windows-1252");
        const decoder = new TextDecoder("windows-1252");
        text = decoder.decode(buffer);
    }

    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const rows = text.split("\n").filter(line => line.trim() !== "");
    const dataRows = rows.slice(1); // Skip header

    let processedCount = 0;
    let errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].trim();
        if (!row) continue;

        const cols = row.split(";").map(c => c.trim());

        const [
            id, date, clientId, clientName, wpId, wpName,
            type, quantity, description, ticketId, note
        ] = cols;

        if (!wpId || !date || !type || !quantity) {
            errors.push(`Fila ${i + 2}: Faltan campos obligatorios (WorkPackageID, Fecha, Tipo, Cantidad)`);
            continue;
        }

        // Validate type
        if (!['EXCESS', 'RETURN', 'MANUAL_CONSUMPTION'].includes(type)) {
            errors.push(`Fila ${i + 2}: Tipo inválido "${type}". Debe ser EXCESS, RETURN o MANUAL_CONSUMPTION`);
            continue;
        }

        // Validate MANUAL_CONSUMPTION has ticketId
        if (type === 'MANUAL_CONSUMPTION' && !ticketId) {
            errors.push(`Fila ${i + 2}: MANUAL_CONSUMPTION requiere TicketID`);
            continue;
        }

        try {
            // Check if WP exists
            const wpExists = await prisma.workPackage.findUnique({
                where: { id: wpId }
            });

            if (!wpExists) {
                errors.push(`Fila ${i + 2}: Work Package "${wpId}" no existe`);
                continue;
            }

            const regData = {
                date: new Date(date),
                workPackageId: wpId,
                type,
                quantity: parseFloat(quantity),
                description: description || null,
                ticketId: ticketId || null,
                note: note || null
            };

            if (id && !isNaN(parseInt(id))) {
                // Update existing
                await prisma.regularization.update({
                    where: { id: parseInt(id) },
                    data: regData
                });
            } else {
                // Create new
                await prisma.regularization.create({
                    data: regData
                });
            }

            processedCount++;

        } catch (error) {
            console.error(`Row ${i + 2} error:`, error);
            errors.push(`Fila ${i + 2}: Error procesando datos - ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    }

    revalidatePath("/admin/regularizations");

    return {
        success: true,
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined
    };
}
