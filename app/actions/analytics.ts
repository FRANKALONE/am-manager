"use server";

import { prisma } from "@/lib/prisma";
import { getVisibilityFilter, getAuthSession } from "@/lib/auth";
import { getNow } from "@/lib/date-utils";

export async function getContractValidityData() {
    try {
        const filter = await getVisibilityFilter();

        // Fetch clients based on visibility
        const clients = await prisma.client.findMany({
            where: filter.isGlobal ? {} : {
                OR: [
                    { manager: filter.managerId },
                    { id: { in: filter.clientIds || [] } }
                ]
            },
            include: {
                workPackages: {
                    where: filter.isGlobal ? {} : {
                        OR: [
                            { id: { in: filter.wpIds || [] } },
                            { client: { manager: filter.managerId } },
                            { client: { id: { in: filter.clientIds || [] } } }
                        ]
                    },
                    include: {
                        validityPeriods: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Transform data for Next.js serialization (dates to ISO strings, null to undefined)
        return clients.map(client => ({
            ...client,
            workPackages: client.workPackages.map(wp => ({
                ...wp,
                validityPeriods: wp.validityPeriods.map(vp => ({
                    ...vp,
                    startDate: vp.startDate.toISOString(),
                    endDate: vp.endDate.toISOString(),
                    premiumPrice: vp.premiumPrice ?? undefined,
                    regularizationRate: vp.regularizationRate ?? undefined,
                    regularizationType: vp.regularizationType ?? undefined,
                    surplusStrategy: vp.surplusStrategy ?? undefined,
                    rateEvolutivo: vp.rateEvolutivo ?? undefined
                }))
            }))
        })) as any; // Type assertion needed due to date string conversion
    } catch (error) {
        console.error("Error fetching contract validity data:", error);
        return [];
    }
}

export async function getWpAccumulatedConsumptionReport() {
    try {
        const filter = await getVisibilityFilter();
        const now = getNow();

        const wps = await prisma.workPackage.findMany({
            where: filter.isGlobal ? {} : {
                OR: [
                    { id: { in: filter.wpIds || [] } },
                    { client: { id: { in: filter.clientIds || [] } } },
                    { client: { manager: filter.managerId } }
                ]
            },
            include: {
                client: { select: { name: true } },
                validityPeriods: { orderBy: { startDate: 'asc' } },
                monthlyMetrics: true,
                regularizations: true,
                tickets: true
            },
            orderBy: { name: 'asc' }
        });

        // We'll use a simplified version of the logic in dashboard.ts
        const reportData = wps.map(wp => {
            // 1. Determine current period
            let selectedPeriod = wp.validityPeriods.find(p => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                end.setHours(23, 59, 59, 999);
                return now >= start && now <= end;
            }) || wp.validityPeriods[wp.validityPeriods.length - 1];

            if (!selectedPeriod) return null;

            const startDate = new Date(selectedPeriod.startDate);
            const endDate = new Date(selectedPeriod.endDate);

            // 2. Logic Selection (Eventos)
            const contractTypeNormalized = wp.contractType?.trim().toUpperCase() || '';
            const isEventos = (contractTypeNormalized === 'EVENTOS' || contractTypeNormalized === 'EVENTO');

            // 3. Simple aggregation for the period
            const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
            const standardMonthlyContracted = totalMonths > 0 ? (selectedPeriod.totalQuantity || 0) / totalMonths : 0;

            let totalContracted = 0;
            let totalConsumed = 0;
            let totalRegularizationCurrent = 0;
            let billedAmount = 0;

            const includedTypes = (wp as any).includedTicketTypes
                ? (wp as any).includedTicketTypes.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
                : [];

            const currentYM = now.getFullYear() * 100 + (now.getMonth() + 1);

            let iterDate = new Date(startDate);
            iterDate.setDate(1);
            let safety = 0;

            while (iterDate <= endDate && safety < 120) {
                safety++;
                const m = iterDate.getMonth() + 1;
                const y = iterDate.getFullYear();
                const iterYM = y * 100 + m;

                let monthlyConsumed = 0;

                if (isEventos) {
                    monthlyConsumed = wp.tickets.filter(t => {
                        if (t.year !== y || t.month !== m) return false;
                        const isEvolutivoTM = t.billingMode === 'T&M contra bolsa';
                        const isEvolutivoEstimate = t.issueType === 'Evolutivo' || t.billingMode === 'Bolsa de Horas' || t.billingMode === 'Bolsa de horas';
                        if (!wp.includeEvoTM && isEvolutivoTM) return false;
                        if (!wp.includeEvoEstimates && isEvolutivoEstimate) return false;
                        const billingModeLower = t.billingMode?.toLowerCase() || '';
                        if (billingModeLower === 'facturable' || billingModeLower === 't&m facturable') return false;
                        if (includedTypes.length > 0 && !includedTypes.includes(t.issueType.toLowerCase())) return false;
                        return true;
                    }).length;
                } else {
                    const metric = wp.monthlyMetrics.find(met => met.month === m && met.year === y);
                    monthlyConsumed = metric ? metric.consumedHours : 0;
                }

                const regs = wp.regularizations.filter(reg => {
                    const rd = new Date(reg.date);
                    return rd.getMonth() + 1 === m && rd.getFullYear() === y;
                });

                const manualConsumption = regs.filter(r => r.type === 'MANUAL_CONSUMPTION').reduce((sum, r) => sum + r.quantity, 0);
                const returnReg = regs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
                const excessReg = regs.filter(r => (r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR') && (r as any).isBilled !== false).reduce((sum, r) => sum + r.quantity, 0);
                const puntualContracted = regs.filter(r => r.type === 'CONTRATACION_PUNTUAL').reduce((sum, r) => sum + r.quantity, 0);

                // For Standard/Bolsa WPs, manual consumption does NOT count towards the balance in dashboard.ts
                // For Eventos, it usually does.
                const finalMonthlyConsumed = isEventos
                    ? monthlyConsumed + manualConsumption - returnReg
                    : monthlyConsumed - returnReg;

                const monthlyContracted = standardMonthlyContracted + puntualContracted;

                totalContracted += monthlyContracted;
                totalRegularizationCurrent += excessReg;
                totalConsumed += finalMonthlyConsumed;

                if (iterYM <= currentYM) {
                    billedAmount += monthlyContracted + excessReg;
                    (wp as any).totalConsumedToDate = ((wp as any).totalConsumedToDate || 0) + finalMonthlyConsumed;
                }

                iterDate.setMonth(iterDate.getMonth() + 1);
            }

            // Calculate carryover (Consistent with dashboard.ts)
            let carryover = 0;
            const previousPeriods = wp.validityPeriods.filter(p => new Date(p.endDate) < startDate);

            const sobrantesBefore = wp.regularizations.filter(reg => {
                const rd = new Date(reg.date);
                const isInAnyPrevPeriod = previousPeriods.some(p => {
                    const ps = new Date(p.startDate);
                    const pe = new Date(p.endDate);
                    return rd >= ps && rd <= pe;
                });
                return !isInAnyPrevPeriod && rd < startDate && (reg.type === 'EXCESS' || reg.type === 'SOBRANTE_ANTERIOR' || reg.type === 'RETURN') && (reg as any).isBilled !== false;
            }).reduce((sum, r) => sum + (r.type === 'RETURN' ? -r.quantity : r.quantity), 0);
            carryover += sobrantesBefore;

            for (const prev of previousPeriods) {
                const pStart = new Date(prev.startDate);
                const pEnd = new Date(prev.endDate);
                const pTotalMonths = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
                const pMonthlyContracted = pTotalMonths > 0 ? (prev.totalQuantity || 0) / pTotalMonths : 0;

                let pIter = new Date(pStart);
                pIter.setDate(1);
                while (pIter <= pEnd) {
                    const pm = pIter.getMonth() + 1;
                    const py = pIter.getFullYear();

                    let pCons = 0;
                    if (isEventos) {
                        pCons = wp.tickets.filter(t => {
                            if (t.year !== py || t.month !== pm) return false;
                            const isEvolutivoTM = t.billingMode === 'T&M contra bolsa';
                            const isEvolutivoEstimate = t.issueType === 'Evolutivo' || t.billingMode === 'Bolsa de Horas' || t.billingMode === 'Bolsa de horas';
                            if (!wp.includeEvoTM && isEvolutivoTM) return false;
                            if (!wp.includeEvoEstimates && isEvolutivoEstimate) return false;
                            const billingModeLower = t.billingMode?.toLowerCase() || '';
                            if (billingModeLower === 'facturable' || billingModeLower === 't&m facturable') return false;
                            if (includedTypes.length > 0 && !includedTypes.includes(t.issueType.toLowerCase())) return false;
                            return true;
                        }).length;
                    } else {
                        const pMetric = wp.monthlyMetrics.find(met => met.month === pm && met.year === py);
                        pCons = pMetric ? pMetric.consumedHours : 0;
                    }

                    const pRegs = wp.regularizations.filter(reg => {
                        const rd = new Date(reg.date);
                        return rd.getMonth() + 1 === pm && rd.getFullYear() === py;
                    });
                    const pReturn = pRegs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
                    const pExcess = pRegs.filter(r => (r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR') && (r as any).isBilled !== false).reduce((sum, r) => sum + r.quantity, 0);
                    const pPuntual = pRegs.filter(r => r.type === 'CONTRATACION_PUNTUAL').reduce((sum, r) => sum + r.quantity, 0);

                    carryover += (pMonthlyContracted + pPuntual - (pCons - pReturn) + pExcess);
                    pIter.setMonth(pIter.getMonth() + 1);
                }
            }

            // Total Scope = Total Contracted in period + Total Regularization in period
            const totalScope = totalContracted + totalRegularizationCurrent;
            // Saldo = Billed until now + carryover - Consumed until now
            const remaining = billedAmount + carryover - ((wp as any).totalConsumedToDate || 0);

            return {
                id: wp.id,
                name: wp.name,
                clientId: wp.clientId,
                clientName: wp.client.name,
                contractType: wp.contractType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                totalScope,
                totalConsumed,
                remaining,
                scopeUnit: selectedPeriod.scopeUnit || (isEventos ? 'Tickets' : 'Horas'),
                isEventos,
                contractedToDate: billedAmount
            };
        }).filter((wp): wp is NonNullable<typeof wp> => wp !== null);

        return reportData;
    } catch (error) {
        console.error("Error fetching wp accumulated consumption report:", error);
        return [];
    }
}
