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

// Helper function to detect CSV delimiter
function detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return commaCount > semicolonCount ? ',' : ';';
}

// Helper function to parse CSV row respecting quoted fields
function parseCSVRow(row: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

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

    if (rows.length === 0) {
        return { error: "El archivo CSV está vacío" };
    }

    // Detect delimiter from first line
    const delimiter = detectDelimiter(text);
    console.log(`Detected delimiter: ${delimiter === ',' ? 'comma' : 'semicolon'}`);

    const headerRow = rows[0];
    const expectedColumns = 11; // Based on the export format
    const headerCols = parseCSVRow(headerRow, delimiter);

    if (headerCols.length < expectedColumns) {
        return {
            error: `Formato de CSV inválido. Se esperaban ${expectedColumns} columnas, pero se encontraron ${headerCols.length}. Delimitador detectado: ${delimiter === ',' ? 'coma (,)' : 'punto y coma (;)'}`
        };
    }

    const dataRows = rows.slice(1); // Skip header

    let processedCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].trim();
        if (!row) continue;

        const cols = parseCSVRow(row, delimiter);

        if (cols.length < expectedColumns) {
            errors.push(`Fila ${i + 2}: Número incorrecto de columnas (${cols.length}/${expectedColumns})`);
            continue;
        }

        const [
            id, date, clientId, clientName, wpId, wpName,
            type, quantity, description, ticketId, note
        ] = cols;

        if (!wpId || !date || !type || !quantity) {
            errors.push(`Fila ${i + 2}: Faltan campos obligatorios - WorkPackageID: "${wpId}", Fecha: "${date}", Tipo: "${type}", Cantidad: "${quantity}"`);
            continue;
        }

        // Validate type
        if (!['EXCESS', 'RETURN', 'MANUAL_CONSUMPTION', 'SOBRANTE_ANTERIOR'].includes(type)) {
            errors.push(`Fila ${i + 2}: Tipo inválido "${type}". Debe ser EXCESS, RETURN, MANUAL_CONSUMPTION o SOBRANTE_ANTERIOR`);
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
                errors.push(`Fila ${i + 2}: Work Package "${wpId}" no existe en la base de datos`);
                continue;
            }

            // Validate date format
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                errors.push(`Fila ${i + 2}: Fecha inválida "${date}". Use formato YYYY-MM-DD`);
                continue;
            }

            // Validate quantity is a number
            const parsedQuantity = parseFloat(quantity);
            if (isNaN(parsedQuantity)) {
                errors.push(`Fila ${i + 2}: Cantidad inválida "${quantity}". Debe ser un número`);
                continue;
            }

            const regData = {
                date: parsedDate,
                workPackageId: wpId,
                type,
                quantity: parsedQuantity,
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
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            errors.push(`Fila ${i + 2}: ${errorMsg}`);
        }
    }

    revalidatePath("/admin/regularizations");

    // Persist log locally
    try {
        await prisma.importLog.create({
            data: {
                type: 'REGULARIZATIONS',
                status: errors.length === 0 ? 'SUCCESS' : (processedCount > 0 ? 'PARTIAL' : 'ERROR'),
                filename: file.name,
                totalRows: dataRows.length,
                processedCount: processedCount,
                errors: errors.length > 0 ? JSON.stringify(errors) : null,
                delimiter: delimiter === ',' ? 'coma' : 'semicolon'
            }
        });
    } catch (e) {
        console.error("Error creating import regularization log:", e);
    }

    return {
        success: true,
        count: processedCount,
        totalRows: dataRows.length,
        delimiter: delimiter === ',' ? 'coma' : 'punto y coma',
        errors: errors.length > 0 ? errors : undefined
    };
}
