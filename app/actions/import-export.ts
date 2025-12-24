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
            "WPOldWpId", "WPJiraProjectKeys",
            "WPAccumulatedHours", "WPAccumulatedHoursDate", "WPCustomAttributes",
            // ValidityPeriod fields (first period)
            "PeriodStartDate", "PeriodEndDate",
            "PeriodTotalQuantity", "PeriodScopeUnit", "PeriodRate",
            "PeriodIsPremium", "PeriodPremiumPrice",
            "PeriodRegularizationType", "PeriodRegularizationRate", "PeriodSurplusStrategy"
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
                    "", "", ""
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
                    wp.oldWpId || "", wp.jiraProjectKeys || "",
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
                    period && period.surplusStrategy ? period.surplusStrategy : ""
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

    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const rows = text.split("\n").filter(line => line.trim() !== "");
    const dataRows = rows.slice(1);

    let processedCount = 0;
    let errors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].trim();
        if (!row) continue;

        const cols = row.split(";").map(c => c.trim());

        const [
            clientId, clientName, clientManager, clientAmOnboardingDate, clientCustomAttrs,
            wpId, wpName, wpContractType, wpBillingType, wpRenewalType,
            wpOldWpId, wpJiraProjectKeys,
            wpAccumulatedHours, wpAccumulatedHoursDate, wpCustomAttrs,
            // ValidityPeriod fields
            periodStartDate, periodEndDate,
            periodTotalQuantity, periodScopeUnit, periodRate,
            periodIsPremium, periodPremiumPrice, periodCorrectionFactor,
            periodRegularizationType, periodRegularizationRate, periodSurplusStrategy
        ] = cols;

        if (!clientId || !clientName) {
            errors.push(`Fila ${i + 2}: Falta ID o Nombre de Cliente`);
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

                    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                        const existingPeriods = await prisma.validityPeriod.findMany({
                            where: { workPackageId: wpId },
                            orderBy: { id: 'asc' },
                            take: 1
                        });

                        const periodData = {
                            startDate,
                            endDate,
                            totalQuantity: periodTotalQuantity ? parseFloat(periodTotalQuantity) : 0,
                            scopeUnit: periodScopeUnit || "HORAS",
                            rate: periodRate ? parseFloat(periodRate) : 0,
                            isPremium: periodIsPremium === "TRUE",
                            premiumPrice: periodPremiumPrice ? parseFloat(periodPremiumPrice) : null,
                            correctionFactor: periodCorrectionFactor ? parseFloat(periodCorrectionFactor) : 1.0,
                            regularizationType: periodRegularizationType || null,
                            regularizationRate: periodRegularizationRate ? parseFloat(periodRegularizationRate) : null,
                            surplusStrategy: periodSurplusStrategy || null
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
            }
            processedCount++;

        } catch (error) {
            console.error(`Row ${i + 2} error:`, error);
            errors.push(`Fila ${i + 2}: Error procesando datos.`);
        }
    }

    revalidatePath("/admin/clients");
    revalidatePath("/admin/work-packages");

    return {
        success: true,
        count: processedCount,
        errors: errors.length > 0 ? errors : undefined
    };
}
