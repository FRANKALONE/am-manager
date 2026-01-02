"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- EXPORT LOGIC ---

export async function exportBulkData() {
    try {
        const clients = await prisma.client.findMany({
            include: {
                workPackages: {
                    include: {
                        validityPeriods: {
                            orderBy: { startDate: 'desc' }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const csvRows = [];
        // Header v3.0 - Updated for new schema
        csvRows.push([
            "ClientId", "ClientName", "ClientManager", "ClientAmOnboardingDate", "ClientCustomAttributes",
            "WPId", "WPName", "WPContractType", "WPBillingType", "WPRenewalType",
            "WPOldWpId", "WPTempoAccountId", "WPJiraProjectKeys",
            "WPAccumulatedHours", "WPAccumulatedHoursDate", "WPCustomAttributes",
            // ValidityPeriod fields (first period)
            "PeriodStartDate", "PeriodEndDate",
            "PeriodTotalQuantity", "PeriodScopeUnit", "PeriodRate",
            "PeriodIsPremium", "PeriodPremiumPrice",
            "PeriodRegularizationType", "PeriodRegularizationRate", "PeriodSurplusStrategy", "PeriodRateEvolutivo"
        ].join(";"));

        for (const client of clients) {
            const onboardingDate = client.amOnboardingDate ? client.amOnboardingDate.toISOString().split('T')[0] : "";

            if (client.workPackages.length === 0) {
                // Client without WPs
                csvRows.push([
                    client.id, client.name, client.manager || "", onboardingDate, client.customAttributes || "{}",
                    "", "", "", "", "",
                    "", "",
                    "", "", "{}",
                    "", "",
                    "", "", "",
                    "", "",
                    "", "", "", ""
                ].join(";"));
            }

            for (const wp of client.workPackages) {
                const period = wp.validityPeriods && wp.validityPeriods.length > 0 ? wp.validityPeriods[0] : null;
                const startDate = period ? period.startDate.toISOString().split('T')[0] : "";
                const endDate = period ? period.endDate.toISOString().split('T')[0] : "";
                const accumDate = wp.accumulatedHoursDate ? wp.accumulatedHoursDate.toISOString().split('T')[0] : "";

                csvRows.push([
                    client.id, client.name, client.manager || "", onboardingDate, client.customAttributes || "{}",

                    wp.id, wp.name, wp.contractType, wp.billingType, wp.renewalType,
                    wp.oldWpId || "", wp.tempoAccountId || "", wp.jiraProjectKeys || "",
                    wp.accumulatedHours.toString(), accumDate, wp.customAttributes || "{}",

                    // ValidityPeriod fields
                    startDate, endDate,
                    period ? period.totalQuantity.toString() : "0",
                    period ? period.scopeUnit : "HORAS",
                    period ? period.rate.toString() : "0",
                    period ? (period.isPremium ? "TRUE" : "FALSE") : "FALSE",
                    period && period.premiumPrice ? period.premiumPrice.toString() : "",
                    period && period.regularizationType ? period.regularizationType : "",
                    period && period.regularizationRate !== undefined && period.regularizationRate !== null ? period.regularizationRate.toString() : "",
                    period && period.surplusStrategy ? period.surplusStrategy : "",
                    period && period.rateEvolutivo !== undefined && period.rateEvolutivo !== null ? period.rateEvolutivo.toString() : ""
                ].join(";"));
            }
        }

        return csvRows.join("\n");

    } catch (error) {
        console.error("Export failed:", error);
        throw new Error("Failed to export data");
    }
}


// --- IMPORT LOGIC ---

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

export async function importBulkData(formData: FormData) {
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
    const expectedColumns = 27; // Based on the export format (added rateEvolutivo)
    const headerCols = parseCSVRow(headerRow, delimiter);

    if (headerCols.length < expectedColumns) {
        return {
            error: `Formato de CSV inválido. Se esperaban ${expectedColumns} columnas, pero se encontraron ${headerCols.length}. Delimitador detectado: ${delimiter === ',' ? 'coma (,)' : 'punto y coma (;)'}`
        };
    }

    const dataRows = rows.slice(1);
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
            clientId, clientName, clientManager, clientAmOnboardingDate, clientCustomAttrs,
            wpId, wpName, wpContractType, wpBillingType, wpRenewalType,
            wpOldWpId, wpTempoAccountId, wpJiraProjectKeys,
            wpAccumulatedHours, wpAccumulatedHoursDate, wpCustomAttrs,
            // ValidityPeriod fields
            periodStartDate, periodEndDate,
            periodTotalQuantity, periodScopeUnit, periodRate,
            periodIsPremium, periodPremiumPrice,
            periodRegularizationType, periodRegularizationRate, periodSurplusStrategy, periodRateEvolutivo
        ] = cols;

        if (!clientId || !clientName) {
            errors.push(`Fila ${i + 2}: Falta ID de Cliente (columna 1) o Nombre de Cliente (columna 2)`);
            continue;
        }

        try {
            // 1. Upsert Client
            await prisma.client.upsert({
                where: { id: clientId },
                update: {
                    name: clientName,
                    manager: clientManager || null,
                    amOnboardingDate: clientAmOnboardingDate ? new Date(clientAmOnboardingDate) : null,
                    customAttributes: clientCustomAttrs || "{}"
                },
                create: {
                    id: clientId,
                    name: clientName,
                    manager: clientManager || null,
                    amOnboardingDate: clientAmOnboardingDate ? new Date(clientAmOnboardingDate) : null,
                    customAttributes: clientCustomAttrs || "{}"
                }
            });

            // 2. Upsert WorkPackage (if present)
            if (wpId && wpName) {
                await prisma.workPackage.upsert({
                    where: { id: wpId },
                    update: {
                        name: wpName,
                        clientId: clientId,
                        clientName: clientName,
                        contractType: wpContractType,
                        billingType: wpBillingType,
                        renewalType: wpRenewalType || "",
                        oldWpId: wpOldWpId || null,
                        tempoAccountId: wpTempoAccountId || null,
                        jiraProjectKeys: wpJiraProjectKeys || null,
                        accumulatedHours: wpAccumulatedHours ? parseFloat(wpAccumulatedHours) : 0.0,
                        accumulatedHoursDate: wpAccumulatedHoursDate ? new Date(wpAccumulatedHoursDate) : null,
                        customAttributes: wpCustomAttrs || "{}"
                    },
                    create: {
                        id: wpId,
                        name: wpName,
                        clientId: clientId,
                        clientName: clientName,
                        contractType: wpContractType,
                        billingType: wpBillingType,
                        renewalType: wpRenewalType || "",
                        oldWpId: wpOldWpId || null,
                        tempoAccountId: wpTempoAccountId || null,
                        jiraProjectKeys: wpJiraProjectKeys || null,
                        accumulatedHours: wpAccumulatedHours ? parseFloat(wpAccumulatedHours) : 0.0,
                        accumulatedHoursDate: wpAccumulatedHoursDate ? new Date(wpAccumulatedHoursDate) : null,
                        customAttributes: wpCustomAttrs || "{}"
                    }
                });

                // 3. Handle Validity Period
                if (periodStartDate && periodEndDate) {
                    const startDate = new Date(periodStartDate);
                    const endDate = new Date(periodEndDate);

                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        errors.push(`Fila ${i + 2}: Fechas inválidas - Inicio: "${periodStartDate}", Fin: "${periodEndDate}"`);
                        continue;
                    }

                    const existingPeriods = await prisma.validityPeriod.findMany({
                        where: { workPackageId: wpId },
                        orderBy: { id: 'asc' },
                        take: 1
                    });

                    const periodData = {
                        startDate,
                        endDate,
                        totalQuantity: (periodTotalQuantity && !isNaN(parseFloat(periodTotalQuantity))) ? parseFloat(periodTotalQuantity) : 0,
                        scopeUnit: periodScopeUnit || "HORAS",
                        rate: (periodRate && !isNaN(parseFloat(periodRate))) ? parseFloat(periodRate) : 0,
                        isPremium: periodIsPremium === "TRUE",
                        premiumPrice: (periodPremiumPrice && !isNaN(parseFloat(periodPremiumPrice))) ? parseFloat(periodPremiumPrice) : null,
                        regularizationType: periodRegularizationType || null,
                        regularizationRate: (periodRegularizationRate && !isNaN(parseFloat(periodRegularizationRate))) ? parseFloat(periodRegularizationRate) : null,
                        surplusStrategy: periodSurplusStrategy || null,
                        rateEvolutivo: (periodRateEvolutivo && !isNaN(parseFloat(periodRateEvolutivo))) ? parseFloat(periodRateEvolutivo) : null
                    };

                    if (existingPeriods[0]) {
                        await prisma.validityPeriod.update({
                            where: { id: existingPeriods[0].id },
                            data: periodData
                        });
                    } else {
                        await prisma.validityPeriod.create({
                            data: {
                                workPackageId: wpId,
                                ...periodData
                            }
                        });
                    }
                }
            }
            processedCount++;

        } catch (error) {
            console.error(`Row ${i + 2} error:`, error);
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            errors.push(`Fila ${i + 2}: ${errorMsg}`);
        }
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/work-packages");

    // Persist log locally
    try {
        await prisma.importLog.create({
            data: {
                type: 'BULK_DATA',
                status: errors.length === 0 ? 'SUCCESS' : (processedCount > 0 ? 'PARTIAL' : 'ERROR'),
                filename: file.name,
                totalRows: dataRows.length,
                processedCount: processedCount,
                errors: errors.length > 0 ? JSON.stringify(errors) : null,
                delimiter: delimiter === ',' ? 'coma' : 'punto y coma'
            }
        });
    } catch (e) {
        console.error("Error creating import log:", e);
    }

    return {
        success: true,
        count: processedCount,
        totalRows: dataRows.length,
        delimiter: delimiter === ',' ? 'coma' : 'punto y coma',
        errors: errors.length > 0 ? errors : undefined
    };
}
