"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- EXPORT LOGIC ---

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
        // Header v4.0 - Added IsDelete
        csvRows.push([
            "IsDelete", "ClientId", "ClientName", "ClientManager", "ClientAmOnboardingDate", "ClientPortalUrl", "ClientJiraProjectKey", "ClientCustomAttributes",
            "WPId", "WPName", "WPContractType", "WPBillingType", "WPRenewalType",
            "WPOldWpId", "WPTempoAccountId", "WPJiraProjectKeys",
            "WPIasService", "WPIncludeEvoEst", "WPIncludeEvoTM",
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
                    "FALSE", client.id, client.name, client.manager || "", onboardingDate, client.portalUrl || "", client.jiraProjectKey || "", client.customAttributes || "{}",
                    "", "", "", "", "",
                    "", "", "",
                    "", "", "",
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
                    "FALSE",
                    client.id, client.name, client.manager || "", onboardingDate, client.portalUrl || "", client.jiraProjectKey || "", client.customAttributes || "{}",

                    wp.id, wp.name, wp.contractType, wp.billingType, wp.renewalType,
                    wp.oldWpId || "", wp.tempoAccountId || "", wp.jiraProjectKeys || "",
                    wp.hasIaasService ? "TRUE" : "FALSE",
                    wp.includeEvoEstimates ? "TRUE" : "FALSE",
                    wp.includeEvoTM ? "TRUE" : "FALSE",
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

function detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return commaCount > semicolonCount ? ',' : ';';
}

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
        const decoder = new TextDecoder("windows-1252");
        text = decoder.decode(buffer);
    }

    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const rows = text.split("\n").filter(line => line.trim() !== "");
    if (rows.length === 0) return { error: "El archivo CSV está vacío" };

    const delimiter = detectDelimiter(text);
    const expectedColumns = 33; // Added IsDelete
    const dataRows = rows.slice(1);
    let processedCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].trim();
        if (!row) continue;

        const cols = parseCSVRow(row, delimiter);
        if (cols.length < expectedColumns) {
            errors.push(`Fila ${i + 2}: Columnas insuficientes (${cols.length}/${expectedColumns})`);
            continue;
        }

        const [
            isDelete, clientId, clientName, clientManager, clientAmOnboardingDate, clientPortalUrl, clientJiraProjectKey, clientCustomAttrs,
            wpId, wpName, wpContractType, wpBillingType, wpRenewalType,
            wpOldWpId, wpTempoAccountId, wpJiraProjectKeys,
            wpIaasService, wpIncludeEvoEst, wpIncludeEvoTM,
            wpAccumulatedHours, wpAccumulatedHoursDate, wpCustomAttrs,
            periodStartDate, periodEndDate,
            periodTotalQuantity, periodScopeUnit, periodRate,
            periodIsPremium, periodPremiumPrice,
            periodRegularizationType, periodRegularizationRate, periodSurplusStrategy, periodRateEvolutivo
        ] = cols;

        if (!clientId) {
            errors.push(`Fila ${i + 2}: Falta ClientId`);
            continue;
        }

        try {
            await prisma.$transaction(async (tx) => {
                // 1. Handle Deletion
                if (isDelete === "TRUE" && wpId) {
                    await tx.workPackage.delete({ where: { id: wpId } });
                    return;
                }

                // 2. Fetch or Create Client
                const existingClient = await tx.client.findUnique({ where: { id: clientId } });
                await tx.client.upsert({
                    where: { id: clientId },
                    update: {
                        name: clientName || existingClient?.name || clientId,
                        manager: clientManager !== "" ? clientManager : (existingClient?.manager || null),
                        amOnboardingDate: clientAmOnboardingDate ? new Date(clientAmOnboardingDate) : (existingClient?.amOnboardingDate || null),
                        portalUrl: clientPortalUrl !== "" ? clientPortalUrl : (existingClient?.portalUrl || null),
                        clientPortalUrl: clientPortalUrl !== "" ? clientPortalUrl : (existingClient?.clientPortalUrl || null),
                        jiraProjectKey: clientJiraProjectKey !== "" ? clientJiraProjectKey : (existingClient?.jiraProjectKey || null),
                        customAttributes: clientCustomAttrs !== "" ? clientCustomAttrs : (existingClient?.customAttributes || "{}")
                    },
                    create: {
                        id: clientId,
                        name: clientName || clientId,
                        manager: clientManager || null,
                        amOnboardingDate: clientAmOnboardingDate ? new Date(clientAmOnboardingDate) : null,
                        portalUrl: clientPortalUrl || null,
                        clientPortalUrl: clientPortalUrl || null,
                        jiraProjectKey: clientJiraProjectKey || null,
                        customAttributes: clientCustomAttrs || "{}"
                    }
                });

                if (!wpId) return;

                // 3. Update WorkPackage
                const existingWp = await tx.workPackage.findUnique({ where: { id: wpId } });
                await tx.workPackage.upsert({
                    where: { id: wpId },
                    update: {
                        name: wpName || existingWp?.name || wpId,
                        clientId: clientId,
                        clientName: clientName || existingWp?.clientName || clientId,
                        contractType: wpContractType || existingWp?.contractType || "BOLSA",
                        billingType: wpBillingType || existingWp?.billingType || "HORAS",
                        renewalType: wpRenewalType !== "" ? wpRenewalType : (existingWp?.renewalType || ""),
                        oldWpId: wpOldWpId !== "" ? wpOldWpId : (existingWp?.oldWpId || null),
                        tempoAccountId: wpTempoAccountId !== "" ? wpTempoAccountId : (existingWp?.tempoAccountId || null),
                        jiraProjectKeys: wpJiraProjectKeys !== "" ? wpJiraProjectKeys : (existingWp?.jiraProjectKeys || null),
                        hasIaasService: wpIaasService !== "" ? (wpIaasService === "TRUE") : (existingWp?.hasIaasService || false),
                        includeEvoEstimates: wpIncludeEvoEst !== "" ? (wpIncludeEvoEst !== "FALSE") : (existingWp?.includeEvoEstimates ?? true),
                        includeEvoTM: wpIncludeEvoTM !== "" ? (wpIncludeEvoTM !== "FALSE") : (existingWp?.includeEvoTM ?? true),
                        accumulatedHours: wpAccumulatedHours !== "" ? parseFloat(wpAccumulatedHours) : (existingWp?.accumulatedHours || 0),
                        accumulatedHoursDate: wpAccumulatedHoursDate ? new Date(wpAccumulatedHoursDate) : (existingWp?.accumulatedHoursDate || null),
                        customAttributes: wpCustomAttrs !== "" ? wpCustomAttrs : (existingWp?.customAttributes || "{}")
                    },
                    create: {
                        id: wpId,
                        name: wpName || wpId,
                        clientId: clientId,
                        clientName: clientName || clientId,
                        contractType: wpContractType || "BOLSA",
                        billingType: wpBillingType || "HORAS",
                        renewalType: wpRenewalType || "",
                        oldWpId: wpOldWpId || null,
                        tempoAccountId: wpTempoAccountId || null,
                        jiraProjectKeys: wpJiraProjectKeys || null,
                        hasIaasService: wpIaasService === "TRUE",
                        includeEvoEstimates: wpIncludeEvoEst !== "FALSE",
                        includeEvoTM: wpIncludeEvoTM !== "FALSE",
                        accumulatedHours: wpAccumulatedHours ? parseFloat(wpAccumulatedHours) : 0,
                        accumulatedHoursDate: wpAccumulatedHoursDate ? new Date(wpAccumulatedHoursDate) : null,
                        customAttributes: wpCustomAttrs || "{}"
                    }
                });

                // 4. Handle Period
                if (periodStartDate && periodEndDate) {
                    const startDate = new Date(periodStartDate);
                    const endDate = new Date(periodEndDate);
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error(`Fechas inválidas: ${periodStartDate} - ${periodEndDate}`);

                    const existingPeriod = await tx.validityPeriod.findFirst({
                        where: { workPackageId: wpId, startDate: startDate }
                    });

                    const periodData = {
                        startDate,
                        endDate,
                        totalQuantity: periodTotalQuantity !== "" ? parseFloat(periodTotalQuantity) : (existingPeriod?.totalQuantity || 0),
                        scopeUnit: periodScopeUnit !== "" ? periodScopeUnit : (existingPeriod?.scopeUnit || "HORAS"),
                        rate: periodRate !== "" ? parseFloat(periodRate) : (existingPeriod?.rate || 0),
                        isPremium: periodIsPremium !== "" ? (periodIsPremium === "TRUE") : (existingPeriod?.isPremium || false),
                        premiumPrice: periodPremiumPrice !== "" ? parseFloat(periodPremiumPrice) : (existingPeriod?.premiumPrice || null),
                        regularizationType: periodRegularizationType !== "" ? periodRegularizationType : (existingPeriod?.regularizationType || null),
                        regularizationRate: periodRegularizationRate !== "" ? parseFloat(periodRegularizationRate) : (existingPeriod?.regularizationRate || null),
                        surplusStrategy: periodSurplusStrategy !== "" ? periodSurplusStrategy : (existingPeriod?.surplusStrategy || null),
                        rateEvolutivo: periodRateEvolutivo !== "" ? parseFloat(periodRateEvolutivo) : (existingPeriod?.rateEvolutivo || null)
                    };

                    if (existingPeriod) {
                        await tx.validityPeriod.update({ where: { id: existingPeriod.id }, data: periodData });
                    } else {
                        await tx.validityPeriod.create({ data: { workPackageId: wpId, ...periodData } });
                    }
                }
            });
            processedCount++;
        } catch (error) {
            console.error(`Row ${i + 2} error:`, error);
            errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/work-packages");

    try {
        await prisma.importLog.create({
            data: {
                type: 'BULK_DATA',
                status: errors.length === 0 ? 'SUCCESS' : (processedCount > 0 ? 'PARTIAL' : 'ERROR'),
                filename: file.name,
                totalRows: dataRows.length,
                processedCount,
                errors: errors.length > 0 ? JSON.stringify(errors) : null,
                delimiter: delimiter === ',' ? 'coma' : 'punto y coma'
            }
        });
    } catch (e) { }

    return {
        success: true,
        count: processedCount,
        totalRows: dataRows.length,
        errors: errors.length > 0 ? errors : undefined
    };
}
