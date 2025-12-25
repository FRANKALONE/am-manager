"use server";

import { prisma } from "@/lib/prisma";
import { syncWorkPackage } from "@/app/actions/sync";
import https from 'https';

// Helper function to count tickets created in a specific month from JIRA
async function getTicketCountFromJira(projectKeys: string, month: number, year: number): Promise<number> {
    try {
        const jiraUrl = process.env.JIRA_URL?.trim();
        const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
        const jiraToken = process.env.JIRA_API_TOKEN?.trim();

        if (!jiraUrl || !jiraEmail || !jiraToken) {
            console.error('[JIRA] Missing credentials');
            return 0;
        }

        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // JQL query to get tickets created in this month
        // Filter by project and creation date, and ticket types
        const jql = `project in (${projectKeys}) AND created >= "${startDateStr}" AND created <= "${endDateStr}" AND issuetype in ("Incidencia", "Correctivo", "Consulta", "Solicitud de Servicio")`;

        const searchUrl = new URL(`${jiraUrl}/rest/api/latest/search`);

        const requestBody = JSON.stringify({
            jql: jql,
            maxResults: 0,
            fields: ['key']
        });

        const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: searchUrl.hostname,
                port: 443,
                path: searchUrl.pathname,
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result.total || 0);
                    } catch (e) {
                        console.error('[JIRA] Parse error:', e);
                        resolve(0);
                    }
                });
            });

            req.on('error', (err) => {
                console.error('[JIRA] Request error:', err);
                resolve(0);
            });

            req.write(requestBody);
            req.end();
        });
    } catch (error) {
        console.error('[JIRA] Error fetching ticket count:', error);
        return 0;
    }
}

export async function getDashboardClients() {
    try {
        return await prisma.client.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
    } catch (error) {
        return [];
    }
}

export async function getDashboardWPs(clientId: string) {
    if (!clientId) return [];
    try {
        return await prisma.workPackage.findMany({
            where: { clientId },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
    } catch (error) {
        console.error("Error loading WPs:", error);
        return [];
    }
}


export async function getDashboardMetrics(wpId: string, validityPeriodId?: number) {
    if (!wpId) return null;
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                monthlyMetrics: {
                    orderBy: [{ year: 'asc' }, { month: 'asc' }]
                },
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                },
                regularizations: {
                    orderBy: { date: 'asc' }
                },
                worklogDetails: {
                    orderBy: [{ year: 'asc' }, { month: 'asc' }]
                },
                tickets: {
                    orderBy: [{ year: 'asc' }, { month: 'asc' }]
                }
            }
        });

        if (!wp) return null;

        // --- Determine which validity period to use ---
        let selectedPeriod = null;
        const now = new Date();

        if (validityPeriodId) {
            // Use specified period
            selectedPeriod = wp.validityPeriods.find(p => p.id === validityPeriodId);
        }

        if (!selectedPeriod) {
            // Find current period (default)
            selectedPeriod = wp.validityPeriods.find(p => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                return now >= start && now <= end;
            });
        }

        if (!selectedPeriod && wp.validityPeriods.length > 0) {
            // Fallback to first period
            selectedPeriod = wp.validityPeriods[0];
        }

        if (!selectedPeriod) {
            // No validity periods defined, use current year
            const currentYear = new Date().getFullYear();
            selectedPeriod = {
                id: 0,
                startDate: new Date(`${currentYear}-01-01`),
                endDate: new Date(`${currentYear}-12-31`),
                workPackageId: wpId
            };
        }

        // --- Monthly Evolution Logic ---
        let evolutionData = [];

        const startDate = new Date(selectedPeriod.startDate);
        const endDate = new Date(selectedPeriod.endDate);

        // 2. Logic Selection (Eventos vs Bolsa Puntual vs Standard)
        const isEventos = (wp.contractType?.toUpperCase() === 'EVENTOS');
        const isBolsaPuntual = (wp.contractType?.toUpperCase() === 'BOLSA' && wp.billingType?.toUpperCase() === 'PUNTUAL');

        const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

        // Standard distribution
        const standardMonthlyContracted = totalMonths > 0 ? (selectedPeriod.totalQuantity || 0) / totalMonths : 0;

        // === EVENTOS LOGIC ===
        if (isEventos) {
            const monthlyContractedEvents = standardMonthlyContracted;

            let iterDate = new Date(startDate);
            iterDate.setDate(1);
            let safety = 0;

            while (iterDate <= endDate && safety < 1200) {
                safety++;
                const m = iterDate.getMonth() + 1;
                const y = iterDate.getFullYear();
                const label = `${m.toString().padStart(2, '0')}/${y}`;

                // Count tickets created in this month from Ticket table
                // This includes ALL tickets synced from JIRA (with or without worklogs)
                const ticketsInMonth = (wp.tickets || []).filter(t =>
                    t.year === y && t.month === m
                ).length;

                // Apply regularizations
                const regs = wp.regularizations?.filter(reg => {
                    const regDate = new Date(reg.date);
                    return regDate.getMonth() + 1 === m && regDate.getFullYear() === y;
                }) || [];

                const manualConsumption = regs.filter(r => r.type === 'MANUAL_CONSUMPTION').reduce((sum, r) => sum + r.quantity, 0);
                const returnReg = regs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
                const excessReg = regs.filter(r => r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR').reduce((sum, r) => sum + r.quantity, 0);

                const consumed = ticketsInMonth + manualConsumption - returnReg;
                const monthlyDifference = monthlyContractedEvents - consumed + excessReg;

                const isStrictFuture = iterDate > now;

                evolutionData.push({
                    month: label,
                    year: y,
                    contracted: monthlyContractedEvents,
                    consumed: consumed,
                    regularization: excessReg,
                    monthlyBalance: monthlyDifference,
                    accumulated: 0, // No accumulation for events
                    isFuture: isStrictFuture
                });

                iterDate.setMonth(iterDate.getMonth() + 1);
            }

            // Calculate KPIs for Events
            const totalContracted = evolutionData.reduce((sum, row) => sum + row.contracted, 0);
            const totalRegularization = evolutionData.reduce((sum, row) => sum + row.regularization, 0);
            const totalScope = totalContracted + totalRegularization;
            const totalConsumed = evolutionData.reduce((sum, row) => sum + row.consumed, 0);
            const remaining = totalScope - totalConsumed;
            const percentage = totalScope > 0 ? (totalConsumed / totalScope) * 100 : 0;

            const validityPeriodsFormatted = wp.validityPeriods.map(p => ({
                id: p.id,
                label: `${new Date(p.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${new Date(p.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                startDate: p.startDate,
                endDate: p.endDate,
                isCurrent: now >= new Date(p.startDate) && now <= new Date(p.endDate)
            }));

            return {
                wpName: wp.name,
                totalScope,
                totalConsumed,
                remaining,
                percentage,
                scopeUnit: selectedPeriod.scopeUnit,
                billedPercentage: 0, // Not applicable for events
                nextRegularization: null, // Not shown for events
                monthlyEvolution: evolutionData,
                validityPeriods: validityPeriodsFormatted,
                selectedPeriodId: selectedPeriod.id,
                isEventos: true,
                contractType: wp.contractType
            };
        }

        // === STANDARD/BOLSA LOGIC (existing code continues) ===

        // 3. Calculate initial accumulated balance from previous periods
        let iterDate = new Date(startDate);
        iterDate.setDate(1); // Normalize

        // Safety Break: Don't loop forever if dates are wrong
        let safety = 0;

        // Calculate accumulated balance from all previous periods
        let accumulatedBalance = 0;

        // --- NEW: Add SOBRANTE_ANTERIOR that are before any period or in gaps ---
        const firstPeriodStartDate = new Date(selectedPeriod.startDate);
        const sobrantesBeforeSelection = wp.regularizations?.filter(reg => {
            const regDate = new Date(reg.date);
            if (reg.type !== 'SOBRANTE_ANTERIOR') return false;
            if (regDate >= firstPeriodStartDate) return false;

            // Only count if it's NOT inside a previous period (to avoid double counting, 
            // as those are handled in the previousPeriods loop)
            const isInPreviousPeriod = wp.validityPeriods.some(p => {
                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);
                return pEnd < firstPeriodStartDate && regDate >= pStart && regDate <= pEnd;
            });
            return !isInPreviousPeriod;
        }).reduce((sum, r) => sum + r.quantity, 0) || 0;

        accumulatedBalance += sobrantesBeforeSelection;

        // Find all periods before the selected one and calculate their final balance
        const previousPeriods = wp.validityPeriods.filter(p => {
            const pEnd = new Date(p.endDate);
            const selectedStart = new Date(selectedPeriod.startDate);
            return pEnd < selectedStart;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        // Calculate balance for each previous period
        for (const prevPeriod of previousPeriods) {
            const pStart = new Date(prevPeriod.startDate);
            const pEnd = new Date(prevPeriod.endDate);
            const pTotalMonths = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
            const pMonthlyContracted = pTotalMonths > 0 ? (prevPeriod.totalQuantity || 0) / pTotalMonths : 0;
            const pIsBolsaPuntual = (wp.contractType?.toUpperCase() === 'BOLSA' && wp.billingType?.toUpperCase() === 'PUNTUAL');

            let pIterDate = new Date(pStart);
            pIterDate.setDate(1);

            while (pIterDate <= pEnd && safety < 1200) {
                safety++;
                const pm = pIterDate.getMonth() + 1;
                const py = pIterDate.getFullYear();

                const pMetric = wp.monthlyMetrics.find(met => met.month === pm && met.year === py);
                let pConsumed = pMetric ? pMetric.consumedHours : 0;

                // Apply RETURN regularizations to consumed
                const pRegs = wp.regularizations?.filter(reg => {
                    const regDate = new Date(reg.date);
                    return regDate.getMonth() + 1 === pm && regDate.getFullYear() === py;
                }) || [];

                const pReturnTotal = pRegs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
                pConsumed = pConsumed - pReturnTotal;

                const pRegTotal = pRegs.filter(r => r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR').reduce((sum, r) => sum + r.quantity, 0);

                let pMonthlyContractedAmount = 0;
                if (pIsBolsaPuntual) {
                    if (pm === (pStart.getMonth() + 1) && py === pStart.getFullYear()) {
                        pMonthlyContractedAmount = prevPeriod.totalQuantity || 0;
                    }
                } else {
                    pMonthlyContractedAmount = pMonthlyContracted;
                }

                const pMonthlyBalance = pMonthlyContractedAmount - pConsumed + pRegTotal;
                accumulatedBalance += pMonthlyBalance;

                pIterDate.setMonth(pIterDate.getMonth() + 1);
            }
        }

        // Reset safety counter for current period iteration
        safety = 0;

        while (iterDate <= endDate && safety < 1200) { // Max 100 years
            safety++;
            const m = iterDate.getMonth() + 1;
            const y = iterDate.getFullYear();
            const label = `${m.toString().padStart(2, '0')}/${y}`;

            // Find consumed data
            const metric = wp.monthlyMetrics.find(met => met.month === m && met.year === y);
            let consumed = metric ? metric.consumedHours : 0;

            // Find regularizations for this month
            const regularizationsThisMonth = wp.regularizations?.filter(reg => {
                const regDate = new Date(reg.date);
                return regDate.getMonth() + 1 === m && regDate.getFullYear() === y;
            }) || [];

            // RETURN regularizations reduce consumed directly
            const returnTotal = regularizationsThisMonth
                .filter(r => r.type === 'RETURN')
                .reduce((sum, r) => sum + r.quantity, 0);

            consumed = consumed - returnTotal; // Adjust consumed with returns

            // Only EXCESS and SOBRANTE_ANTERIOR regularizations appear in regularization column
            const regularizationTotal = regularizationsThisMonth
                .filter(r => r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR')
                .reduce((sum, r) => sum + r.quantity, 0);

            const isStrictFuture = (y > now.getFullYear()) || (y === now.getFullYear() && m > (now.getMonth() + 1));

            // Logic: Contracted Amount
            let monthlyContracted = 0;
            if (isBolsaPuntual) {
                // Only assign total quantity to the VERY FIRST month of validity
                if (m === (startDate.getMonth() + 1) && y === startDate.getFullYear()) {
                    monthlyContracted = selectedPeriod.totalQuantity || 0;
                } else {
                    monthlyContracted = 0;
                }
            } else {
                monthlyContracted = standardMonthlyContracted;
            }

            // Logic: Balance = Contratado - Consumido (ya ajustado con RETURN) + Regularización (solo EXCESS)
            const monthlyBalance = monthlyContracted - consumed + regularizationTotal;

            // Logic: Accumulated
            if (!isStrictFuture) {
                accumulatedBalance += monthlyBalance;
            }

            evolutionData.push({
                month: label,
                year: y,
                contracted: monthlyContracted,
                consumed: consumed,
                regularization: regularizationTotal,
                monthlyBalance: monthlyBalance,
                accumulated: accumulatedBalance,
                isFuture: isStrictFuture
            });

            // Next month
            iterDate.setMonth(iterDate.getMonth() + 1);
        }

        // Calculate KPI totals by summing the table columns
        // Define period dates for next regularization calculation
        const periodStart = new Date(selectedPeriod.startDate);
        const periodEnd = new Date(selectedPeriod.endDate);

        // Contratado = Σ columna "Contratado" + Σ columna "Regularización"
        const totalContracted = evolutionData.reduce((sum, row) => sum + row.contracted, 0);
        const totalRegularization = evolutionData.reduce((sum, row) => sum + row.regularization, 0);
        const totalScope = totalContracted + totalRegularization;

        // Consumido = Σ columna "Consumido"
        const totalConsumed = evolutionData.reduce((sum, row) => sum + row.consumed, 0);

        // Disponible = Contratado - Consumido + Sobrantes de periodos anteriores
        const remaining = totalScope - totalConsumed + sobrantesBeforeSelection;
        const percentage = totalScope > 0 ? (totalConsumed / totalScope) * 100 : 0;

        // Calculate billed percentage (what has been invoiced up to current month)
        // Facturado = Contratado hasta mes actual + Regularizaciones EXCESS hasta mes actual
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const billedContracted = evolutionData
            .filter(row => {
                const [month, year] = row.month.split('/').map(Number);
                const rowYearMonth = year * 100 + month;
                const currentYearMonth = currentYear * 100 + currentMonth;
                return rowYearMonth <= currentYearMonth && !row.isFuture;
            })
            .reduce((sum, row) => sum + row.contracted + row.regularization, 0);

        const billedPercentage = totalScope > 0 ? (billedContracted / totalScope) * 100 : 0;

        // Format validity periods for frontend
        const validityPeriodsFormatted = wp.validityPeriods.map(p => ({
            id: p.id,
            label: `${new Date(p.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${new Date(p.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
            startDate: p.startDate,
            endDate: p.endDate,
            isCurrent: now >= new Date(p.startDate) && now <= new Date(p.endDate)
        }));

        // Calculate regularizations for the selected period
        const periodRegularizations = wp.regularizations?.filter(reg => {
            const regDate = new Date(reg.date);
            const periodStart = new Date(selectedPeriod.startDate);
            const periodEnd = new Date(selectedPeriod.endDate);
            return regDate >= periodStart && regDate <= periodEnd;
        }) || [];

        const excessTotal = periodRegularizations
            .filter(r => r.type === 'EXCESS' || r.type === 'SOBRANTE_ANTERIOR')
            .reduce((sum, r) => sum + r.quantity, 0);

        const returnTotal = periodRegularizations
            .filter(r => r.type === 'RETURN')
            .reduce((sum, r) => sum + r.quantity, 0);

        const manualConsumptionTotal = periodRegularizations
            .filter(r => r.type === 'MANUAL_CONSUMPTION')
            .reduce((sum, r) => sum + r.quantity, 0);


        // Calculate next regularization
        let nextRegularization = null;
        if (selectedPeriod.regularizationType && selectedPeriod.regularizationRate && accumulatedBalance < 0) {
            const hoursToRegularize = Math.abs(accumulatedBalance);
            const amount = hoursToRegularize * selectedPeriod.regularizationRate;

            // Calculate next regularization date based on type
            let nextDate = null;
            const regType = selectedPeriod.regularizationType.toUpperCase();

            if (regType === 'MENSUAL') {
                // End of current month
                const today = new Date();
                nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            } else if (regType === 'TRIMESTRAL') {
                // Every 3 months from period start
                const monthsSinceStart = (now.getFullYear() - periodStart.getFullYear()) * 12 + (now.getMonth() - periodStart.getMonth());
                const nextQuarter = Math.ceil((monthsSinceStart + 1) / 3) * 3;
                nextDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + nextQuarter, 0);
            } else if (regType === 'SEMESTRAL') {
                // Every 6 months from period start
                const monthsSinceStart = (now.getFullYear() - periodStart.getFullYear()) * 12 + (now.getMonth() - periodStart.getMonth());
                const nextSemester = Math.ceil((monthsSinceStart + 1) / 6) * 6;
                nextDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + nextSemester, 0);
            } else if (regType === 'ANUAL') {
                // End of 12 months from period start
                nextDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 12, 0);
            }

            if (nextDate && nextDate > now) {
                nextRegularization = {
                    hours: hoursToRegularize,
                    amount: amount,
                    date: nextDate,
                    type: selectedPeriod.regularizationType
                };
            }
        }

        return {
            wpName: wp.name,
            totalScope,
            totalConsumed,
            remaining,
            percentage,
            scopeUnit: selectedPeriod.scopeUnit,
            billedPercentage,
            nextRegularization,
            monthlyEvolution: evolutionData,
            validityPeriods: validityPeriodsFormatted,
            selectedPeriodId: selectedPeriod.id,
            lastSyncedAt: wp.lastSyncedAt,
            contractType: wp.contractType,
            isEventos: false
        };
    } catch (error) {
        console.error("Dashboard Error", error);
        return null;
    }
}

export async function getMonthlyDetails(wpId: string, year: number, month: number) {
    "use server";

    try {
        // Get the work package with client info
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                client: {
                    select: { portalUrl: true }
                }
            }
        });

        const worklogs = await prisma.worklogDetail.findMany({
            where: {
                workPackageId: wpId,
                year,
                month
            },
            orderBy: [
                { issueType: 'asc' },
                { issueKey: 'asc' },
                { startDate: 'asc' }
            ]
        });

        // Get all regularizations for this month (EXCESS, RETURN, SOBRANTE_ANTERIOR, MANUAL_CONSUMPTION)
        const regularizations = await prisma.regularization.findMany({
            where: {
                workPackageId: wpId,
                date: {
                    gte: new Date(year, month - 1, 1),
                    lte: new Date(year, month, 0, 23, 59, 59)
                }
            },
            orderBy: { date: 'asc' }
        });

        // Get pending review requests for this WP to mark claimed worklogs
        const pendingReviewRequests = await prisma.reviewRequest.findMany({
            where: {
                workPackageId: wpId,
                status: 'PENDING'
            }
        });

        // Build a set of worklog IDs that are in pending review requests
        const claimedWorklogIds = new Set<number>();
        pendingReviewRequests.forEach(req => {
            try {
                const ids = JSON.parse(req.worklogIds) as number[];
                ids.forEach(id => claimedWorklogIds.add(id));
            } catch (e) {
                console.error('Error parsing worklog IDs from review request:', e);
            }
        });

        // Get all unique ticket keys from this month (filter out nulls)
        const ticketKeys = Array.from(new Set(worklogs.map(w => w.issueKey).filter((key): key is string => key !== null)));

        // Check which tickets have consumption in other months
        const ticketsWithOtherMonths: Record<string, boolean> = {};
        for (const ticketKey of ticketKeys) {
            const otherMonthsCount = await prisma.worklogDetail.count({
                where: {
                    workPackageId: wpId,
                    issueKey: ticketKey,
                    OR: [
                        { year: { not: year } },
                        { AND: [{ year }, { month: { not: month } }] }
                    ]
                }
            });
            ticketsWithOtherMonths[ticketKey] = otherMonthsCount > 0;
        }

        // Group by ticket type
        const byType: Record<string, any[]> = {};
        worklogs.forEach(w => {
            if (!byType[w.issueType]) {
                byType[w.issueType] = [];
            }
            byType[w.issueType].push(w);
        });

        // Calculate totals per type and add multi-month info + claimed status
        const result = Object.entries(byType).map(([type, logs]) => ({
            type,
            totalHours: logs.reduce((sum, l) => sum + l.timeSpentHours, 0),
            ticketCount: new Set(logs.map(l => l.issueKey)).size,
            worklogs: logs.map(log => ({
                ...log,
                hasOtherMonths: ticketsWithOtherMonths[log.issueKey] || false,
                isClaimed: claimedWorklogIds.has(log.id)
            })),
            portalUrl: wp?.client?.portalUrl || null
        }));

        // Add all regularizations as a separate section if any exist
        const response: any = {
            ticketTypes: result,
            regularizations: regularizations.map(reg => ({
                id: reg.id,
                type: reg.type,
                date: reg.date,
                quantity: reg.quantity,
                description: reg.description || (
                    reg.type === 'RETURN' ? 'Devolución de horas' :
                        reg.type === 'EXCESS' ? 'Exceso / Regularización' :
                            reg.type === 'SOBRANTE_ANTERIOR' ? 'Sobrante Periodo Anterior' : 'Regularización'
                )
            })),
            portalUrl: wp?.client?.portalUrl || null
        };

        return response;
    } catch (error) {
        console.error("Error fetching monthly details:", error);
        return { ticketTypes: [], returnRegularizations: [], portalUrl: null };
    }
}

/**
 * Get ticket details for a specific month (Events WP only)
 */
export async function getMonthlyTicketDetails(wpId: string, year: number, month: number) {
    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                workPackageId: wpId,
                year: year,
                month: month
            },
            orderBy: [
                { issueType: 'asc' },
                { createdDate: 'asc' }
            ]
        });

        // Group by type for summary
        const byType: Record<string, number> = {};
        tickets.forEach(t => {
            byType[t.issueType] = (byType[t.issueType] || 0) + 1;
        });

        return {
            totalTickets: tickets.length,
            byType,
            tickets: tickets.map(t => ({
                issueKey: t.issueKey,
                issueSummary: t.issueSummary,
                issueType: t.issueType,
                createdDate: t.createdDate,
                status: t.status,
                reporter: t.reporter
            }))
        };
    } catch (error) {
        console.error("Error fetching monthly ticket details:", error);
        return {
            totalTickets: 0,
            byType: {},
            tickets: []
        };
    }
}

/**
 * Get ticket consumption report aggregated by ticket with monthly breakdown
 */
export async function getTicketConsumptionReport(wpId: string, validityPeriodId?: number) {
    "use server";

    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: wpId },
            include: {
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                },
                client: {
                    select: { portalUrl: true }
                }
            }
        });

        if (!wp) return null;

        // Determine which validity period to use
        let selectedPeriod = null;
        const now = new Date();

        if (validityPeriodId) {
            selectedPeriod = wp.validityPeriods.find(p => p.id === validityPeriodId);
        }

        if (!selectedPeriod) {
            selectedPeriod = wp.validityPeriods.find(p => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                return now >= start && now <= end;
            });
        }

        if (!selectedPeriod && wp.validityPeriods.length > 0) {
            selectedPeriod = wp.validityPeriods[0];
        }

        if (!selectedPeriod) {
            return null;
        }

        const startDate = new Date(selectedPeriod.startDate);
        const endDate = new Date(selectedPeriod.endDate);

        // Get all worklogs for this period
        const worklogs = await prisma.worklogDetail.findMany({
            where: {
                workPackageId: wpId,
                OR: [
                    {
                        AND: [
                            { year: { gte: startDate.getFullYear() } },
                            { year: { lte: endDate.getFullYear() } }
                        ]
                    }
                ]
            },
            orderBy: [
                { issueKey: 'asc' },
                { year: 'asc' },
                { month: 'asc' }
            ]
        });

        // Filter worklogs to only include those within the period
        const filteredWorklogs = worklogs.filter(w => {
            const worklogDate = new Date(w.year, w.month - 1, 1);
            return worklogDate >= startDate && worklogDate <= endDate;
        });

        // Get ticket statuses from Ticket model
        const ticketKeys = Array.from(new Set(filteredWorklogs.map(w => w.issueKey).filter((key): key is string => key !== null)));
        const ticketStatuses = await prisma.ticket.findMany({
            where: {
                workPackageId: wpId,
                issueKey: { in: ticketKeys }
            },
            select: {
                issueKey: true,
                status: true
            }
        });

        const ticketStatusMap: Record<string, string> = {};
        ticketStatuses.forEach(t => {
            ticketStatusMap[t.issueKey] = t.status;
        });

        // Group by ticket
        const ticketMap: Record<string, any> = {};

        filteredWorklogs.forEach(w => {
            if (!w.issueKey) return;

            if (!ticketMap[w.issueKey]) {
                ticketMap[w.issueKey] = {
                    issueKey: w.issueKey,
                    issueSummary: w.issueSummary,
                    issueType: w.issueType,
                    issueStatus: ticketStatusMap[w.issueKey] || 'N/A',
                    totalHours: 0,
                    monthlyBreakdown: []
                };
            }

            ticketMap[w.issueKey].totalHours += w.timeSpentHours;

            // Add to monthly breakdown
            const monthKey = `${w.month.toString().padStart(2, '0')}/${w.year}`;
            const existingMonth = ticketMap[w.issueKey].monthlyBreakdown.find((m: any) => m.month === monthKey);

            if (existingMonth) {
                existingMonth.hours += w.timeSpentHours;
            } else {
                ticketMap[w.issueKey].monthlyBreakdown.push({
                    month: monthKey,
                    year: w.year,
                    monthNum: w.month,
                    hours: w.timeSpentHours
                });
            }
        });

        // Convert to array and sort by total hours descending
        const tickets = Object.values(ticketMap)
            .sort((a: any, b: any) => b.totalHours - a.totalHours)
            .map((ticket: any) => ({
                ...ticket,
                monthlyBreakdown: ticket.monthlyBreakdown.sort((a: any, b: any) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.monthNum - b.monthNum;
                })
            }));

        return {
            tickets,
            totalTickets: tickets.length,
            totalHours: tickets.reduce((sum: number, t: any) => sum + t.totalHours, 0),
            portalUrl: wp.client?.portalUrl || null,
            periodLabel: `${new Date(selectedPeriod.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${new Date(selectedPeriod.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        };
    } catch (error) {
        console.error("Error fetching ticket consumption report:", error);
        return null;
    }
}
