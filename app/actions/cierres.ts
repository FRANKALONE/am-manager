"use server";

import { prisma } from "@/lib/prisma";
import { syncWorkPackage } from "@/app/actions/sync";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { formatDate, getNow } from "@/lib/date-utils";

export interface CierreCandidate {
    wpId: string;
    wpName: string;
    clientName: string;
    contractType: string | null;
    accumulatedBalance: number;
    lastSyncedAt: Date | null;
    regularizationType: string | null;
    isDueThisMonth: boolean;
    needsSync: boolean;
    suggestedAmount: number; // Quantity to bill
    suggestedCashAmount: number; // (Quantity to bill) * (Regularization Rate)
    unit: string;
    needsPO?: boolean;
    reportEmails?: string | null;
    reportSentAt?: Date | null;
    reportSentBy?: string | null;
}

export interface EventosMonthStatus {
    label: string;
    contracted: number;
    consumed: number;
    isExceeded: boolean;
}

export interface EventosStatus {
    wpId: string;
    wpName: string;
    clientName: string;
    unit: string;
    months: EventosMonthStatus[];
    totalContracted: number;
    totalConsumed: number;
    isTotalExceeded: boolean;
}

/**
 * Calculates if a WP is due for regularization this month based on its frequency
 */
function checkIsDueThisMonth(startDate: Date, regType: string | null, targetMonth: number, targetYear: number): boolean {
    if (!regType) return false;
    const type = regType.toUpperCase();

    // Monthly is always due
    if (type === 'MENSUAL') return true;

    // Quarterly (March, June, September, December)
    if (type === 'TRIMESTRAL') {
        return [3, 6, 9, 12].includes(targetMonth);
    }

    // Semi-annually (June, December)
    if (type === 'SEMESTRAL') {
        return [6, 12].includes(targetMonth);
    }

    // Annually (December)
    if (type === 'ANUAL') {
        return targetMonth === 12;
    }

    return false;
}

export async function getPendingCierres(month: number, year: number) {
    try {
        const wps = await prisma.workPackage.findMany({
            include: {
                client: { select: { name: true, reportEmails: true } },
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                },
                monthlyMetrics: true,
                regularizations: true,
                tickets: true
            }
        });

        const candidates: CierreCandidate[] = [];
        const processed: CierreCandidate[] = [];
        const eventosMonitor: EventosStatus[] = [];
        const now = getNow();
        const targetYYYYMM = year * 100 + month;

        for (const wp of wps) {
            // Find validity period for target date
            const targetDateForPeriod = new Date(year, month - 1, 1);
            const period = wp.validityPeriods.find(p => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                return targetDateForPeriod >= start && targetDateForPeriod <= end;
            });

            if (!period) continue;

            const isEventos = (wp.contractType?.toUpperCase() === 'EVENTOS');
            const isBolsaPuntual = (wp.contractType?.toUpperCase() === 'BOLSA' && wp.billingType?.toUpperCase() === 'PUNTUAL');

            // --- EVENTOS MONITORING LOGIC ---
            if (isEventos) {
                const start = new Date(period.startDate);
                const end = new Date(period.endDate);
                const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
                const monthlyContracted = totalMonths > 0 ? (period.totalQuantity || 0) / totalMonths : 0;

                const monthsData: EventosMonthStatus[] = [];
                let iterDate = new Date(start);
                iterDate.setDate(1);

                let safety = 0;
                while (safety < 1200) {
                    const py = iterDate.getFullYear();
                    const pm = iterDate.getMonth() + 1;
                    const iterYYYYMM = py * 100 + pm;
                    if (iterYYYYMM > targetYYYYMM) break;

                    const ticketsInMonth = wp.tickets.filter(t => t.year === py && t.month === pm).length;

                    // Add manual consumptions if any
                    const regs = wp.regularizations.filter(r => {
                        const rd = new Date(r.date);
                        return rd.getMonth() + 1 === pm && rd.getFullYear() === py;
                    });
                    const manualCons = regs.filter(r => r.type === 'MANUAL_CONSUMPTION').reduce((sum, r) => sum + r.quantity, 0);
                    const returns = regs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
                    const puntualContracted = regs.filter(r => r.type === 'CONTRATACION_PUNTUAL').reduce((sum, r) => sum + r.quantity, 0);

                    const consumed = ticketsInMonth + manualCons - returns;

                    monthsData.push({
                        label: `${pm.toString().padStart(2, '0')}/${py}`,
                        contracted: monthlyContracted + puntualContracted,
                        consumed: consumed,
                        isExceeded: consumed > (monthlyContracted + puntualContracted)
                    });

                    iterDate.setMonth(iterDate.getMonth() + 1);
                    safety++;
                }

                const totalContracted = monthsData.reduce((sum, m) => sum + m.contracted, 0);
                const totalConsumed = monthsData.reduce((sum, m) => sum + m.consumed, 0);

                eventosMonitor.push({
                    wpId: wp.id,
                    wpName: wp.name,
                    clientName: wp.client.name,
                    unit: period.scopeUnit || 'TICKETS',
                    months: monthsData,
                    totalContracted,
                    totalConsumed,
                    isTotalExceeded: totalConsumed > totalContracted
                });
                continue;
            }

            // --- STANDARD BAGS LOGIC ---
            let accumulatedBalance = 0;
            let safety = 0;

            // 1. All previous periods
            const currentPeriodStart = new Date(period.startDate);
            const currentPeriodStartYYYYMM = currentPeriodStart.getFullYear() * 100 + (currentPeriodStart.getMonth() + 1);

            const previousPeriods = wp.validityPeriods.filter(p => {
                const pEnd = new Date(p.endDate);
                const pEndYYYYMM = pEnd.getFullYear() * 100 + (pEnd.getMonth() + 1);
                return pEndYYYYMM < currentPeriodStartYYYYMM;
            }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

            for (const prevPeriod of previousPeriods) {
                const pStart = new Date(prevPeriod.startDate);
                const pEnd = new Date(prevPeriod.endDate);
                const pTotalMonths = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
                const pMonthlyContracted = pTotalMonths > 0 ? (prevPeriod.totalQuantity || 0) / pTotalMonths : 0;

                let pIterDate = new Date(pStart);
                pIterDate.setDate(1);
                const prevEndLimitYYYYMM = pEnd.getFullYear() * 100 + (pEnd.getMonth() + 1);

                while (safety < 1200) {
                    const py = pIterDate.getFullYear();
                    const pm = pIterDate.getMonth() + 1;
                    const pIterYYYYMM = py * 100 + pm;
                    if (pIterYYYYMM > prevEndLimitYYYYMM) break;

                    safety++;
                    const pMetric = wp.monthlyMetrics.find(met => met.month === pm && met.year === py);
                    let pConsumed = pMetric ? pMetric.consumedHours : 0;

                    const pRegs = wp.regularizations?.filter(reg => {
                        const regDate = new Date(reg.date);
                        return regDate.getMonth() + 1 === pm && regDate.getFullYear() === py;
                    }) || [];

                    const pReturnTotal = pRegs.filter((r: any) => r.type === 'RETURN').reduce((sum: number, r: any) => sum + r.quantity, 0);
                    const pRegTotal = pRegs.filter((r: any) => (r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR') && r.isBilled === true).reduce((sum: number, r: any) => sum + r.quantity, 0);
                    const pPuntualTotal = pRegs.filter((r: any) => r.type === 'CONTRATACION_PUNTUAL').reduce((sum: number, r: any) => sum + r.quantity, 0);

                    pConsumed = pConsumed - pReturnTotal;

                    let pMonthlyContractedAmount = 0;
                    if (isBolsaPuntual && pm === (pStart.getMonth() + 1) && py === pStart.getFullYear()) {
                        pMonthlyContractedAmount = prevPeriod.totalQuantity || 0;
                    } else if (!isBolsaPuntual) {
                        pMonthlyContractedAmount = pMonthlyContracted;
                    }

                    accumulatedBalance += ((pMonthlyContractedAmount + pPuntualTotal) - pConsumed + pRegTotal);
                    pIterDate.setMonth(pIterDate.getMonth() + 1);
                }
            }

            // 1.5 Add initial gaps/sobrantes before selection (mirroring dashboard.ts)
            const firstPeriodStart = new Date(wp.validityPeriods[0].startDate);
            const sobrantesBeforeSelection = wp.regularizations?.filter(reg => {
                const regDate = new Date(reg.date);
                if (regDate >= firstPeriodStart) return false;
                const isInPreviousPeriod = wp.validityPeriods.some(p => {
                    const pStart = new Date(p.startDate);
                    const pEnd = new Date(p.endDate);
                    return pEnd < firstPeriodStart && regDate >= pStart && regDate <= pEnd;
                });
                return !isInPreviousPeriod && (reg.type === 'EXCESS' || reg.type === 'SOBRANTE_ANTERIOR' || reg.type === 'RETURN') && reg.isBilled === true;
            }).reduce((sum, r) => sum + r.quantity, 0) || 0;

            accumulatedBalance += sobrantesBeforeSelection;

            // 2. Current period up to target month
            const currentStart = new Date(period.startDate);
            const currentEnd = new Date(period.endDate);
            const totalMonths = (currentEnd.getFullYear() - currentStart.getFullYear()) * 12 + (currentEnd.getMonth() - currentStart.getMonth()) + 1;
            const standardMonthlyContracted = totalMonths > 0 ? (period.totalQuantity || 0) / totalMonths : 0;

            let iterDate = new Date(currentStart);
            iterDate.setDate(1);

            let hasProcessedThisMonth = false;
            let alreadyInvoicedAmount = 0;

            // Direct check for processing in target month to be 100% sure
            const monthProcessedReg = wp.regularizations?.find(r => {
                const rd = new Date(r.date);
                // We use UTC to avoid local timezone shifts at end-of-month dates
                const isExcessBilled = (r.type === 'EXCESS' && r.isBilled === true);
                const isApprovedExcess = (r.type === 'APPROVED_EXCESS');
                return (isExcessBilled || isApprovedExcess)
                    && (rd.getUTCMonth() + 1 === month || rd.getMonth() + 1 === month)
                    && (rd.getUTCFullYear() === year || rd.getFullYear() === year);
            });

            if (monthProcessedReg) {
                console.log(`[CIERRES] Processed reg found for ${wp.name}:`, monthProcessedReg.quantity);
                hasProcessedThisMonth = true;
                alreadyInvoicedAmount = monthProcessedReg.quantity;
            }

            while (safety < 1200) {
                const y = iterDate.getFullYear();
                const m = iterDate.getMonth() + 1;
                const iterYYYYMM = y * 100 + m;
                if (iterYYYYMM > targetYYYYMM) break;

                safety++;
                const metric = wp.monthlyMetrics.find(met => met.month === m && met.year === y);
                let consumed = metric ? metric.consumedHours : 0;

                const regs = wp.regularizations?.filter(reg => {
                    const regDate = new Date(reg.date);
                    return regDate.getMonth() + 1 === m && regDate.getFullYear() === y;
                }) || [];

                const returnTotal = regs.filter((r: any) => r.type === 'RETURN').reduce((sum: number, r: any) => sum + r.quantity, 0);
                const regTotal = regs.filter((r: any) => (r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR') && r.isBilled === true).reduce((sum: number, r: any) => sum + r.quantity, 0);
                const puntualTotal = regs.filter((r: any) => r.type === 'CONTRATACION_PUNTUAL').reduce((sum: number, r: any) => sum + r.quantity, 0);

                consumed = consumed - returnTotal;

                let monthlyContracted = 0;
                if (isBolsaPuntual && m === (currentStart.getMonth() + 1) && y === currentStart.getFullYear()) {
                    monthlyContracted = period.totalQuantity || 0;
                } else if (!isBolsaPuntual) {
                    monthlyContracted = standardMonthlyContracted;
                }

                accumulatedBalance += ((monthlyContracted + puntualTotal) - consumed + regTotal);
                iterDate.setMonth(iterDate.getMonth() + 1);
            }

            const balance = accumulatedBalance;
            const isDue = checkIsDueThisMonth(period.startDate, period.regularizationType, month, year);
            const isOutdated = !wp.lastSyncedAt || (now.getTime() - new Date(wp.lastSyncedAt).getTime() > 24 * 60 * 60 * 1000);

            const regRate = period.regularizationRate || period.rate || 0;
            const candidateData = {
                wpId: wp.id,
                wpName: wp.name,
                clientName: wp.client.name,
                contractType: wp.contractType,
                accumulatedBalance: balance,
                lastSyncedAt: wp.lastSyncedAt,
                regularizationType: period.regularizationType,
                isDueThisMonth: isDue,
                needsSync: isOutdated,
                unit: period.scopeUnit || 'HORAS',
                suggestedAmount: balance < 0 ? Math.abs(balance) : 0,
                suggestedCashAmount: (balance < 0 ? Math.abs(balance) : 0) * regRate,
                needsPO: balance < -0.01 && period.regularizationType?.toUpperCase() === 'BAJO_PEDIDO',
                reportEmails: wp.client.reportEmails,
                reportSentAt: wp.monthlyMetrics.find(m => m.month === month && m.year === year)?.reportSentAt,
                reportSentBy: wp.monthlyMetrics.find(m => m.month === month && m.year === year)?.reportSentBy
            };

            if (hasProcessedThisMonth) {
                processed.push({
                    ...candidateData,
                    suggestedAmount: alreadyInvoicedAmount,
                    suggestedCashAmount: alreadyInvoicedAmount * regRate
                });
            } else {
                const monthlyMetric = wp.monthlyMetrics.find(met => met.month === month && met.year === year);
                const monthlyConsumed = monthlyMetric ? monthlyMetric.consumedHours : 0;
                const monthlyRegs = wp.regularizations?.filter(r => {
                    const rd = new Date(r.date);
                    return rd.getMonth() + 1 === month && rd.getFullYear() === year;
                }) || [];

                const monthlyReturn = monthlyRegs.filter((r: any) => r.type === 'RETURN').reduce((sum: number, r: any) => sum + r.quantity, 0);
                const effectiveMonthlyConsumed = monthlyConsumed - monthlyReturn;

                let monthlyContracted = 0;
                if (isBolsaPuntual && month === (currentStart.getMonth() + 1) && year === currentStart.getFullYear()) {
                    monthlyContracted = period.totalQuantity || 0;
                } else if (!isBolsaPuntual) {
                    monthlyContracted = standardMonthlyContracted;
                }

                const monthlyBalance = monthlyContracted - effectiveMonthlyConsumed;

                if (balance < -0.01 || monthlyBalance < -0.01 || isDue) {
                    candidates.push(candidateData);
                }
            }
        }

        return { candidates, processed, eventosMonitor };
    } catch (error) {
        console.error("Error fetching pending cierres:", error);
        throw new Error("Error al obtener candidatos de cierre");
    }
}

export async function processBatchCierres(month: number, year: number, selection: { wpId: string, amount: number }[]) {
    try {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const item of selection) {
            try {
                const res = await processCierre(item.wpId, month, year, item.amount, "Procesado en lote");
                if (res.success) results.success++;
                else {
                    results.failed++;
                    results.errors.push(`${item.wpId}: ${res.error}`);
                }
            } catch (error: any) {
                results.failed++;
                results.errors.push(`${item.wpId}: ${error.message}`);
            }
        }

        revalidatePath("/cierres");
        revalidatePath("/dashboard");
        return results;
    } catch (error: any) {
        console.error("Batch processing error:", error);
        throw new Error("Error al procesar el lote");
    }
}

export async function processCierre(wpId: string, month: number, year: number, amount: number, note: string, isRevenueRecognized: boolean = false, isBilled: boolean = true, createdBy?: string, createdByName?: string) {
    try {
        // 1. Mandatory safety sync
        console.log(`[CIERRE] Safety sync for ${wpId}...`);
        await syncWorkPackage(wpId);

        // 2. Create regularization record
        const regularization = await prisma.regularization.create({
            data: {
                workPackageId: wpId,
                date: new Date(year, month - 1, 28), // End of month typically
                type: 'EXCESS',
                quantity: amount,
                description: `Regularización Cierre ${month}/${year}. ${note}`,
                isRevenueRecognized,
                isBilled,
                createdBy,
                createdByName
            },
            include: {
                workPackage: {
                    include: {
                        client: true,
                        validityPeriods: {
                            orderBy: { endDate: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        // 3. Notify Manager if assigned
        const managerId = regularization.workPackage.client.manager;
        if (managerId) {
            const unit = regularization.workPackage.validityPeriods[0]?.scopeUnit || 'Horas';
            const title = `📈 Exceso detectado: ${regularization.workPackage.client.name}`;
            const message = `Se ha generado una regularización por exceso de ${amount.toFixed(2)} ${unit} en el WP "${regularization.workPackage.name}" durante el cierre de ${month}/${year}. Ya puedes descargar el reporte detallado en PDF desde el panel de cierres.`;
            await createNotification(
                "SURPLUS_DETECTED",
                {
                    clientName: regularization.workPackage.client.name,
                    amount: amount.toFixed(2),
                    unit,
                    wpName: regularization.workPackage.name,
                    month,
                    year
                },
                regularization.id.toString(),
                regularization.workPackage.clientId,
                managerId
            );
        }

        // 3. Re-scan to update WP total hours if needed (handled by sync normally)
        revalidatePath("/cierres");
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error: any) {
        console.error("Error processing cierre:", error);
        return { success: false, error: error.message };
    }
}

export async function markReportAsSent(wpId: string, month: number, year: number, sentBy: string) {
    try {
        await prisma.monthlyMetric.upsert({
            where: {
                workPackageId_year_month: {
                    workPackageId: wpId,
                    year,
                    month
                }
            },
            create: {
                workPackageId: wpId,
                year,
                month,
                reportSentAt: getNow(),
                reportSentBy: sentBy
            },
            update: {
                reportSentAt: getNow(),
                reportSentBy: sentBy
            }
        });

        revalidatePath("/cierres");
        return { success: true };
    } catch (error: any) {
        console.error("Error marking report as sent:", error);
        return { success: false, error: error.message };
    }
}

export async function getClosureReportData(wpId: string, month: number, year: number) {
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                client: true,
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                },
                monthlyMetrics: true,
                regularizations: true
            }
        });

        if (!wp) throw new Error("WP not found");

        const targetDate = new Date(year, month - 1, 1);
        const targetYYYYMM = year * 100 + month;

        const period = wp.validityPeriods.find(p => {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            return targetDate >= start && targetDate <= end;
        });

        if (!period) throw new Error("No hay un periodo de vigencia definido para esta fecha");

        const isBolsaPuntual = (wp.contractType?.toUpperCase() === 'BOLSA' && wp.billingType?.toUpperCase() === 'PUNTUAL');

        // Determine start point for the evolution table: strictly since last regularization
        let cutoffYYYYMM: number | null = null;

        // Find the most recent EXCESS regularization BEFORE the target month
        const prevExcessRegs = wp.regularizations
            ?.filter(r => {
                const rd = new Date(r.date);
                const regYYYYMM = rd.getFullYear() * 100 + (rd.getMonth() + 1);
                return r.type === 'EXCESS' && regYYYYMM < targetYYYYMM;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (prevExcessRegs && prevExcessRegs.length > 0) {
            const lastRegDate = new Date(prevExcessRegs[0].date);
            // The next month after last regularization is the first one to show
            const nextMonth = new Date(lastRegDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            cutoffYYYYMM = nextMonth.getFullYear() * 100 + (nextMonth.getMonth() + 1);
        }

        // Build monthly summary iterating history (mirroring getPendingCierres logic)
        const summary: { label: string, contracted: number, consumed: number, balance: number }[] = [];
        let accumulatedBalance = 0;
        let safety = 0;

        // 1. Initial balance from sobrantes before any period
        const firstPeriodStart = new Date(wp.validityPeriods[0].startDate);
        const sobrantesBeforeSelection = wp.regularizations?.filter(reg => {
            const regDate = new Date(reg.date);
            if (regDate >= firstPeriodStart) return false;
            return (reg.type === 'EXCESS' || reg.type === 'SOBRANTE_ANTERIOR' || reg.type === 'RETURN') && reg.isBilled !== false;
        }).reduce((sum, r) => sum + r.quantity, 0) || 0;

        accumulatedBalance += sobrantesBeforeSelection;

        // 2. Iterate all periods up to current
        for (const p of wp.validityPeriods) {
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            const pStartYYYYMM = pStart.getFullYear() * 100 + (pStart.getMonth() + 1);
            const pEndYYYYMM = pEnd.getFullYear() * 100 + (pEnd.getMonth() + 1);

            if (pStartYYYYMM > targetYYYYMM) continue;

            const pTotalMonths = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
            const pMonthlyContracted = pTotalMonths > 0 ? (p.totalQuantity || 0) / pTotalMonths : 0;

            let pIterDate = new Date(pStart);
            pIterDate.setDate(1);

            while (safety < 2400) {
                const py = pIterDate.getFullYear();
                const pm = pIterDate.getMonth() + 1;
                const pIterYYYYMM = py * 100 + pm;

                if (pIterYYYYMM > pEndYYYYMM || pIterYYYYMM > targetYYYYMM) break;

                const metric = wp.monthlyMetrics.find(met => met.month === pm && met.year === py);
                let consumed = metric ? metric.consumedHours : 0;

                const regs = wp.regularizations?.filter((reg: any) => {
                    const regDate = new Date(reg.date);
                    return regDate.getMonth() + 1 === pm && regDate.getFullYear() === py;
                }) || [];

                const returnTotal = regs.filter((r: any) => r.type === 'RETURN').reduce((sum: number, r: any) => sum + r.quantity, 0);
                const regTotal = regs.filter((r: any) => (r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR') && r.isBilled === true).reduce((sum: number, r: any) => sum + r.quantity, 0);
                const puntualTotal = regs.filter((r: any) => r.type === 'CONTRATACION_PUNTUAL').reduce((sum: number, r: any) => sum + r.quantity, 0);

                consumed = consumed - returnTotal;

                let monthlyContracted = 0;
                if (isBolsaPuntual && pm === (pStart.getMonth() + 1) && py === pStart.getFullYear()) {
                    monthlyContracted = p.totalQuantity || 0;
                } else if (!isBolsaPuntual) {
                    monthlyContracted = pMonthlyContracted;
                }

                const monthBalance = (monthlyContracted + puntualTotal) - consumed + regTotal;
                accumulatedBalance += monthBalance;

                // Add to summary if it's within the requested window
                // If no previous regularization, start from the first period
                if ((cutoffYYYYMM === null || pIterYYYYMM >= cutoffYYYYMM) && pIterYYYYMM <= targetYYYYMM) {
                    summary.push({
                        label: `${pm.toString().padStart(2, '0')}/${py}`,
                        contracted: monthlyContracted + puntualTotal,
                        consumed: consumed,
                        balance: accumulatedBalance
                    });
                }

                pIterDate.setMonth(pIterDate.getMonth() + 1);
                safety++;
            }
        }

        return {
            wpName: wp.name,
            clientName: wp.client.name,
            period: `${formatDate(period.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })} - ${formatDate(period.endDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}`,
            unit: period.scopeUnit || "HORAS",
            summary: summary,
            totalAccumulated: accumulatedBalance
        };
    } catch (error: any) {
        console.error("Error fetching report data for WP:", wpId, error);
        throw new Error(`Error fetching report data: ${error.message}`);
    }
}

export interface RevenueRecognition {
    id: number;
    wpId: string;
    wpName: string;
    clientName: string;
    amount: number;
    date: Date;
    description: string | null;
    unit: string;
    createdBy: string | null;
}

export async function getPendingRevenueRecognitions(month: number, year: number): Promise<RevenueRecognition[]> {
    try {
        const regs = await prisma.regularization.findMany({
            where: {
                type: 'EXCESS',
                isRevenueRecognized: true,
                isBilled: false,
                date: {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date(year, month, 1)
                }
            },
            include: {
                workPackage: {
                    include: {
                        client: true,
                        validityPeriods: { orderBy: { endDate: 'desc' }, take: 1 }
                    }
                }
            }
        });

        return regs.map(r => ({
            id: r.id,
            wpId: r.workPackageId,
            wpName: r.workPackage.name,
            clientName: r.workPackage.client.name,
            amount: r.quantity,
            date: r.date,
            description: r.description,
            unit: r.workPackage.validityPeriods[0]?.scopeUnit || 'HORAS',
            createdBy: r.createdByName
        }));
    } catch (error: any) {
        console.error("Error fetching pending revenue recognitions:", error);
        throw new Error("Error al obtener reconocimientos de ingreso pendientes");
    }
}

export async function convertRevenueRecognitionToBilled(regularizationId: number) {
    try {
        await prisma.regularization.update({
            where: { id: regularizationId },
            data: { isBilled: true }
        });

        revalidatePath('/cierres');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error("Error converting revenue recognition to billed:", error);
        return { success: false, error: error.message };
    }
}

export async function approveExcessForMonth(wpId: string, month: number, year: number, note: string, approvedBy?: string, approvedByName?: string) {
    try {
        // Create an APPROVED_EXCESS regularization with quantity 0
        // This serves as a marker that this month was reviewed and approved
        await prisma.regularization.create({
            data: {
                workPackageId: wpId,
                date: new Date(year, month - 1, 28),
                type: 'APPROVED_EXCESS',
                quantity: 0,
                description: `Exceso aprobado para ${month}/${year}. ${note}`,
                isBilled: false,
                isRevenueRecognized: false,
                createdBy: approvedBy,
                createdByName: approvedByName
            }
        });

        revalidatePath('/cierres');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error("Error approving excess for month:", error);
        return { success: false, error: error.message };
    }
}
