"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchTempoAccountId } from "@/lib/tempo-helper";
import { getNow, getStartOfToday } from "@/lib/date-utils";
import { getTranslations } from "@/lib/get-translations";
// import { syncWorkPackage } from "./sync";

export type WorkPackageFilters = {
    clientId?: string;
    contractType?: string;
    isPremium?: boolean;
    renewalType?: string;
    status?: "active" | "inactive" | "all";
    month?: number;
    year?: number;
};

export async function getWorkPackages(filters?: WorkPackageFilters) {
    try {
        const where: any = {};

        if (filters?.clientId) {
            where.clientId = filters.clientId;
        }
        if (filters?.contractType) {
            where.contractType = filters.contractType;
        }
        if (filters?.isPremium !== undefined) {
            where.isPremium = filters.isPremium;
        }
        if (filters?.renewalType) {
            where.renewalType = filters.renewalType;
        }

        const status = filters?.status || "active";

        if (status === "active") {
            const now = getNow();
            const startOfToday = getStartOfToday();
            where.validityPeriods = {
                some: {
                    startDate: { lte: now },
                    endDate: { gte: startOfToday }
                }
            };
        } else if (status === "inactive") {
            const now = getNow();
            const startOfToday = getStartOfToday();
            where.validityPeriods = {
                none: {
                    startDate: { lte: now },
                    endDate: { gte: startOfToday }
                }
            };
        }

        if (filters?.month !== undefined && filters?.year !== undefined) {
            const startOfMonth = new Date(filters.year, filters.month, 1);
            const endOfMonth = new Date(filters.year, filters.month + 1, 0, 23, 59, 59);

            if (where.validityPeriods) {
                where.validityPeriods.some.endDate = {
                    gte: startOfMonth,
                    lte: endOfMonth
                };
            } else {
                where.validityPeriods = {
                    some: {
                        endDate: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    }
                };
            }
        }

        const wps = await prisma.workPackage.findMany({
            where,
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { validityPeriods: true }
                },
                validityPeriods: true
            }
        });
        return wps;
    } catch (error) {
        console.error("Failed to fetch WPs:", error);
        return [];
    }
}

export async function getWorkPackageById(id: string) {
    try {
        return await prisma.workPackage.findUnique({
            where: { id },
            include: {
                validityPeriods: { orderBy: { startDate: 'desc' } },
                regularizations: { orderBy: { date: 'desc' } }
            }
        });
    } catch (error) {
        return null;
    }
}

export async function createWorkPackage(prevState: any, formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const clientId = formData.get("clientId") as string;

    // General fields
    const contractType = formData.get("contractType") as string;
    const billingType = formData.get("billingType") as string;
    const renewalType = formData.get("renewalType") as string;
    const jiraProjectKeys = formData.get("jiraProjectKeys")?.toString();

    // Economic fields (now for ValidityPeriod)
    const totalQuantity = parseFloat(formData.get("totalQuantity") as string);
    const rate = parseFloat(formData.get("rate") as string);
    const isPremium = formData.get("isPremium") === "true"; // Match the select value
    const premiumPriceStr = formData.get("premiumPrice") as string;
    const premiumPrice = premiumPriceStr ? parseFloat(premiumPriceStr) : null;

    // Management fields (now for ValidityPeriod)
    const scopeUnit = formData.get("scopeUnit") as string;
    const regularizationType = formData.get("regularizationType") as string;
    const surplusStrategy = formData.get("surplusStrategy") as string;
    const rateEvolutivoStr = formData.get("rateEvolutivo") as string;
    const rateEvolutivo = rateEvolutivoStr ? parseFloat(rateEvolutivoStr) : null;
    const regularizationRateStr = formData.get("regularizationRate") as string;
    const regularizationRate = regularizationRateStr ? parseFloat(regularizationRateStr) : null;

    // Accumulation fields
    const accumulatedHoursStr = formData.get("accumulatedHours") as string;
    const accumulatedHours = accumulatedHoursStr ? parseFloat(accumulatedHoursStr) : 0.0;
    const accumulatedHoursDateStr = formData.get("accumulatedHoursDate") as string;
    const accumulatedHoursDate = accumulatedHoursDateStr ? new Date(accumulatedHoursDateStr) : null;

    // Initial Validity Period
    const initialStartDateStr = formData.get("initialStartDate") as string;
    const initialEndDateStr = formData.get("initialEndDate") as string;

    // Consumo configuration
    const includedTicketTypes = formData.get("includedTicketTypes")?.toString();
    const includeEvoEstimates = formData.get("includeEvoEstimates") === "on";
    const includeEvoTM = formData.get("includeEvoTM") === "on";
    const hasIaasService = formData.get("hasIaasService") === "on";
    const isMainWP = formData.get("isMainWP") === "on";

    // Custom Attributes
    const customAttributes: Record<string, any> = {};
    Array.from(formData.entries()).forEach(([key, value]) => {
        if (key.startsWith("custom_")) {
            const fieldName = key.replace("custom_", "");
            customAttributes[fieldName] = value;
        }
    });

    const { t } = await getTranslations();

    if (!id || id.length > 20) return { error: t('errors.maxLength', { field: 'ID', count: 20 }) };
    if (!name) return { error: t('errors.required', { field: t('common.name') }) };
    if (!clientId) return { error: t('errors.required', { field: t('dashboard.client') }) };

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { error: t('errors.notFound', { item: t('dashboard.client') }) };

    // Fetch Tempo Account ID automatically
    let tempoAccountId: string | null = null;
    try {
        const fetchedId = await fetchTempoAccountId(id);
        tempoAccountId = fetchedId ? String(fetchedId) : null;
        if (tempoAccountId) {
            console.log(`Auto-fetched Tempo Account ID ${tempoAccountId} for new WP ${id}`);
        }
    } catch (error) {
        console.warn('Failed to fetch Tempo Account ID:', error);
        // Continue without Account ID - will use slow sync method
    }

    try {
        // If this is marked as Main WP, unmark others for the same client
        if (isMainWP) {
            await prisma.workPackage.updateMany({
                where: { clientId },
                data: { isMainWP: false }
            });
        }

        await prisma.workPackage.create({
            data: {
                id,
                name,
                clientId,
                clientName: client.name,
                contractType,
                billingType,
                renewalType,

                accumulatedHours,
                accumulatedHoursDate,

                customAttributes: JSON.stringify(customAttributes),
                jiraProjectKeys: jiraProjectKeys || null,
                tempoAccountId,
                includedTicketTypes: includedTicketTypes || null,
                includeEvoEstimates,
                includeEvoTM,
                hasIaasService,
                isMainWP,

                validityPeriods: (initialStartDateStr && initialEndDateStr) ? {
                    create: {
                        startDate: new Date(initialStartDateStr),
                        endDate: new Date(initialEndDateStr),
                        // Economic fields now in ValidityPeriod
                        totalQuantity,
                        rate,
                        isPremium,
                        premiumPrice,
                        // Management fields now in ValidityPeriod
                        scopeUnit,
                        regularizationType: regularizationType || null,
                        regularizationRate,
                        surplusStrategy: surplusStrategy || null,
                        rateEvolutivo
                    }
                } : undefined
            },
        });
    } catch (error) {
        console.error(error);
        const { t } = await getTranslations();
        return { error: t('errors.createError', { item: 'WP' }) + ". " + t('errors.alreadyExists', { item: 'ID' }) };
    }

    revalidatePath("/admin/work-packages");
    redirect("/admin/work-packages");
}

export async function updateWorkPackage(id: string, prevState: any, formData: FormData) {
    console.log("updateWorkPackage called for ID:", id);

    // WorkPackage fields
    const name = formData.get("name") as string;
    const contractType = formData.get("contractType") as string;
    const billingType = formData.get("billingType") as string;
    const renewalType = formData.get("renewalType") as string;
    const jiraProjectKeys = formData.get("jiraProjectKeys")?.toString();
    const oldWpId = formData.get("oldWpId")?.toString();
    const hasIaasService = formData.get("hasIaasService") === "on";
    const includedTicketTypes = formData.get("includedTicketTypes")?.toString();
    const includeEvoEstimates = formData.get("includeEvoEstimates") === "on";
    const includeEvoTM = formData.get("includeEvoTM") === "on";
    const isMainWP = formData.get("isMainWP") === "on";
    const returnUrl = formData.get("returnUrl") as string;

    // ValidityPeriod fields (economic and management)
    const totalQuantity = parseFloat(formData.get("totalQuantity") as string);
    const scopeUnit = formData.get("scopeUnit") as string;
    const rate = parseFloat(formData.get("rate") as string);
    const isPremium = formData.get("isPremium") === "true";
    const premiumPriceStr = formData.get("premiumPrice") as string;
    const premiumPrice = premiumPriceStr ? parseFloat(premiumPriceStr) : null;
    const regularizationType = formData.get("regularizationType") as string;
    const regularizationRateStr = formData.get("regularizationRate") as string;
    const regularizationRate = regularizationRateStr ? parseFloat(regularizationRateStr) : null;
    const surplusStrategy = formData.get("surplusStrategy") as string;
    const rateEvolutivoStr = formData.get("rateEvolutivo") as string;
    const rateEvolutivo = rateEvolutivoStr ? parseFloat(rateEvolutivoStr) : null;

    // Period dates
    const periodStartDateStr = formData.get("periodStartDate") as string;
    const periodEndDateStr = formData.get("periodEndDate") as string;

    // Accumulation fields (remain in WorkPackage)
    const accumulatedHoursStr = formData.get("accumulatedHours") as string;
    const accumulatedHours = accumulatedHoursStr ? parseFloat(accumulatedHoursStr) : 0.0;
    const accumulatedHoursDateStr = formData.get("accumulatedHoursDate") as string;
    const accumulatedHoursDate = accumulatedHoursDateStr ? new Date(accumulatedHoursDateStr) : null;

    const tempoAccountIdFromForm = formData.get("tempoAccountId")?.toString();
    const customAttributes: Record<string, any> = {};
    Array.from(formData.entries()).forEach(([key, value]) => {
        if (key.startsWith("custom_")) {
            const fieldName = key.replace("custom_", "");
            customAttributes[fieldName] = value;
        }
    });

    console.log("Updating WP:", { name, jiraProjectKeys, isPremium });

    // Fetch existing WP to handle Tempo Account ID and Validity Periods
    const existingWP = await prisma.workPackage.findUnique({
        where: { id },
        select: {
            tempoAccountId: true,
            validityPeriods: {
                orderBy: { startDate: 'desc' },
                take: 1
            },
            clientId: true
        }
    });

    const { t } = await getTranslations();

    if (!existingWP) return { error: t('errors.notFound', { item: 'Work Package' }) };

    // Handle Tempo Account ID update
    let tempoAccountId: string | null | undefined = undefined;

    // Priority: 1. Field from form (if provided), 2. Keep existing or Auto-fetch if DB is empty
    if (tempoAccountIdFromForm !== undefined && tempoAccountIdFromForm !== "") {
        tempoAccountId = tempoAccountIdFromForm;
    } else if (!existingWP.tempoAccountId) {
        try {
            const fetchedId = await fetchTempoAccountId(id);
            tempoAccountId = fetchedId ? String(fetchedId) : null;
            if (tempoAccountId) {
                console.log(`Auto-fetched Tempo Account ID ${tempoAccountId} for WP ${id}`);
            }
        } catch (error) {
            console.warn('Failed to fetch Tempo Account ID:', error);
        }
    }

    try {
        // Handle Main WP logic
        if (isMainWP) {
            await prisma.workPackage.updateMany({
                where: { clientId: existingWP.clientId },
                data: { isMainWP: false }
            });
        }

        // Build update data object conditionally
        const wpUpdateData: any = {
            customAttributes: JSON.stringify(customAttributes),
        };

        // Only update fields that are present in the form
        if (name) wpUpdateData.name = name;
        if (contractType) wpUpdateData.contractType = contractType;
        if (billingType) wpUpdateData.billingType = billingType;
        if (renewalType) wpUpdateData.renewalType = renewalType;
        if (jiraProjectKeys !== undefined) wpUpdateData.jiraProjectKeys = jiraProjectKeys || null;
        if (oldWpId !== undefined) wpUpdateData.oldWpId = oldWpId || null;
        if (formData.has("hasIaasService")) wpUpdateData.hasIaasService = hasIaasService;
        if (includedTicketTypes !== undefined) wpUpdateData.includedTicketTypes = includedTicketTypes || null;
        if (formData.has("includeEvoEstimates")) wpUpdateData.includeEvoEstimates = includeEvoEstimates;
        if (formData.has("includeEvoTM")) wpUpdateData.includeEvoTM = includeEvoTM;
        if (formData.has("isMainWP")) wpUpdateData.isMainWP = isMainWP;
        if (accumulatedHoursStr) wpUpdateData.accumulatedHours = accumulatedHours;
        if (accumulatedHoursDateStr) wpUpdateData.accumulatedHoursDate = accumulatedHoursDate;
        if (tempoAccountId !== undefined) wpUpdateData.tempoAccountId = tempoAccountId;

        // Update WorkPackage fields only
        await prisma.workPackage.update({
            where: { id },
            data: wpUpdateData
        });

        // Update the current ValidityPeriod if period fields are present
        if (existingWP?.validityPeriods?.[0] && (totalQuantity || scopeUnit || rate !== undefined || isPremium !== undefined)) {
            const currentPeriod = existingWP.validityPeriods[0];
            const periodUpdateData: any = {};

            if (!isNaN(totalQuantity)) periodUpdateData.totalQuantity = totalQuantity;
            if (scopeUnit) periodUpdateData.scopeUnit = scopeUnit;
            if (!isNaN(rate)) periodUpdateData.rate = rate;
            if (formData.has("isPremium")) periodUpdateData.isPremium = isPremium;
            if (premiumPriceStr !== null && premiumPriceStr !== undefined) periodUpdateData.premiumPrice = premiumPrice;
            if (regularizationType) periodUpdateData.regularizationType = regularizationType || null;
            if (regularizationRateStr !== null && regularizationRateStr !== undefined) periodUpdateData.regularizationRate = regularizationRate;
            if (surplusStrategy) periodUpdateData.surplusStrategy = surplusStrategy || null;
            if (rateEvolutivoStr !== null && rateEvolutivoStr !== undefined) periodUpdateData.rateEvolutivo = rateEvolutivo;
            if (periodStartDateStr) periodUpdateData.startDate = new Date(periodStartDateStr);
            if (periodEndDateStr) periodUpdateData.endDate = new Date(periodEndDateStr);

            if (Object.keys(periodUpdateData).length > 0) {
                await prisma.validityPeriod.update({
                    where: { id: currentPeriod.id },
                    data: periodUpdateData
                });
            }
        }

        console.log("WP Update Success");
    } catch (error) {
        console.error("WP Update Error:", error);
        const { t } = await getTranslations();
        return { error: t('errors.updateError', { item: 'WP' }) };
    }

    revalidatePath("/admin/work-packages");
    console.log("Redirecting to:", returnUrl || "/admin/work-packages");
    redirect(returnUrl || "/admin/work-packages");
}


export async function deleteWorkPackage(id: string) {
    try {
        await prisma.workPackage.delete({ where: { id } });
        revalidatePath("/admin/work-packages");
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: '' }) };
    }
}

// Validity Period Actions
export async function addValidityPeriod(
    wpId: string,
    startDate: Date,
    endDate: Date,
    totalQuantity: number,
    rate: number,
    isPremium: boolean,
    premiumPrice: number | null,
    scopeUnit: string,
    regularizationType: string | null,
    regularizationRate: number | null,
    surplusStrategy: string | null,
    rateEvolutivo: number | null
) {
    try {
        await prisma.validityPeriod.create({
            data: {
                workPackageId: wpId,
                startDate,
                endDate,
                totalQuantity,
                rate,
                isPremium,
                premiumPrice,
                scopeUnit,
                regularizationType,
                regularizationRate,
                surplusStrategy,
                rateEvolutivo
            }
        });
        revalidatePath(`/admin/work-packages/${wpId}/edit`);
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.createError', { item: t('workPackages.validity.addTitle') }) };
    }
}

export async function updateValidityPeriod(
    id: number,
    startDate: Date,
    endDate: Date,
    totalQuantity: number,
    rate: number,
    isPremium: boolean,
    premiumPrice: number | null,
    scopeUnit: string,
    regularizationType: string | null,
    regularizationRate: number | null,
    surplusStrategy: string | null,
    rateEvolutivo: number | null
) {
    try {
        const vp = await prisma.validityPeriod.update({
            where: { id },
            data: {
                startDate,
                endDate,
                totalQuantity,
                rate,
                isPremium,
                premiumPrice,
                scopeUnit,
                regularizationType,
                regularizationRate,
                surplusStrategy,
                rateEvolutivo
            }
        });
        revalidatePath(`/admin/work-packages/${vp.workPackageId}/edit`);
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.updateError', { item: t('workPackages.validity.addTitle') }) };
    }
}

export async function deleteValidityPeriod(id: number) {
    try {
        const vp = await prisma.validityPeriod.delete({ where: { id } });
        revalidatePath(`/admin/work-packages/${vp.workPackageId}/edit`);
        return { success: true };
    } catch (error) {
        const { t } = await getTranslations();
        return { success: false, error: t('errors.deleteError', { item: t('workPackages.validity.addTitle') }) };
    }
}
