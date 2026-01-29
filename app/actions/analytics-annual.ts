// app/actions/analytics-annual.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { fetchTempo } from '@/lib/tempo';

export interface AnnualReportData {
    // Executive Summary
    totalIncidents: number;
    prevYearIncidents: number;
    slaFirstResponseCompliance: number;
    slaResolutionCompliance: number;
    avgSatisfaction: number | null;

    // New KPIs requested
    clientsKPI: {
        total: number;
        newAbsolute: number;
        growthRelative: number;
        details: Array<{
            id: string;
            name: string;
            isNew: boolean;
        }>;
    };
    employeesKPI: {
        total: number;
        growthAbs: number;
        growthRel: number;
        teamsBreakdown: Array<{
            teamName: string;
            count: number;
            prevCount: number;
            growthAbs: number;
            growthRel: number;
        }>;
    };

    // New KPI: Total Clientes por tipo de Contrato
    contractClientsKPI: {
        types: Array<{ type: string; count: number }>;
        details: Array<{ clientId: string; clientName: string; type: string }>;
    };

    // New KPI: Total Horas Contratadas
    contractedHoursKPI: {
        total: number;
        regularizationsTotal: number;
        unconsumedTotal: number;
        breakdownByWP: Array<{
            name: string;
            type: string;
            contracted: number;
            consumed: number;
            remaining: number;
        }>;
    };

    // Evolutivos (from existing dashboard)
    evolutivos: {
        creados: number;
        entregados: number;
        solicitadas: number;
        enviadas: number;
        aprobadas: number;
        ratioAceptacion: number;
        ratioEnvio: number;
    };

    // Incidents Volume
    incidentsByType: Array<{ type: string; count: number; prevCount: number }>;
    incidentsByMonth: Array<{ month: number; count: number }>;
    incidentsByComponent: Array<{ component: string; count: number }>;

    // SLA Compliance
    slaMetrics: {
        firstResponse: {
            total: number;
            compliant: number;
            avgTime: number; // in hours
        };
        resolution: {
            total: number;
            compliant: number;
            avgTime: number; // in hours
        };
    };

    // Client Analysis (keep for compatibility if needed, but we use clientsKPI)
    clients: {
        total: number;
        newClients: Array<{ id: string; name: string; firstTicketDate: Date }>;
        clientList: Array<{
            id: string;
            name: string;
            isNew: boolean;
        }>;
    };

    // Corrective Metrics
    correctiveMetrics: {
        mttr: number; // Mean Time To Repair (hours)
        reopenRate: number; // percentage
        backlog: number; // pending tickets
        backlogDetails: Array<{
            type: string;
            count: number;
            byClient: Array<{
                id: string;
                name: string;
                count: number;
            }>;
        }>;
    };

    // Satisfaction
    satisfaction: {
        byMonth: Array<{ month: number; avg: number | null; count: number }>;
        byClient: Array<{ clientId: string; clientName: string; avg: number | null; count: number }>;
    };

    // Monthly breakdown
    monthly: Array<{
        month: number;
        incidents: number;
        evolutivos: number;
        slaCompliance: number;
        satisfaction: number | null;
        backlog: number; // New: accumulated backlog
    }>;

    // Satisfaction detailed breakdown
    satisfactionMetrics: {
        globalAvg: number | null;
        prevYearAvg: number | null;
        byType: Array<{ type: string; avg: number; count: number }>;
        byTeam: Array<{ team: string; avg: number; count: number }>;
    };
}

export async function getAnnualReport(year: number, clientId?: string): Promise<AnnualReportData> {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    // Get client filter
    let clientsListIds: string[] = [];
    if (clientId) {
        clientsListIds = [clientId];
    } else if (session.role === 'CLIENTE') {
        if (!session.clientId) throw new Error('Client ID not found');
        clientsListIds = [session.clientId];
    } else {
        const allClients = await prisma.client.findMany({ where: { isDemo: false }, select: { id: true } });
        clientsListIds = allClients.map(c => c.id);
    }

    // === INCIDENTS VOLUME ===

    const startPrev = new Date(`${year - 1}-01-01T00:00:00Z`);
    const endPrev = new Date(`${year - 1}-12-31T23:59:59Z`);

    const currentYearTickets = await prisma.ticket.findMany({
        where: {
            createdDate: { gte: start, lte: end },
            NOT: {
                issueType: { in: ['Evolutivo', 'Petición de Evolutivo'], mode: 'insensitive' }
            }
        },
        select: {
            issueKey: true,
            issueType: true,
            createdDate: true,
            component: true,
            status: true,
            resolution: true,
            slaResolution: true,
            slaResponse: true,
            slaResolutionTime: true,
            slaResponseTime: true,
            workPackage: { select: { clientId: true, clientName: true } }
        }
    });

    // For the previous year, count tickets with createdDate in that year
    // excluding only evolutionary types (Evolutivo, Petición de Evolutivo)
    const prevYearTickets = await prisma.ticket.findMany({
        where: {
            createdDate: { gte: startPrev, lte: endPrev },
            NOT: {
                issueType: { in: ['Evolutivo', 'Petición de Evolutivo'], mode: 'insensitive' }
            }
        },
        select: { issueType: true }
    });

    const totalIncidents = currentYearTickets.length;
    const prevYearIncidents = prevYearTickets.length;

    // By Type
    const currentTypes = currentYearTickets.reduce((acc: Record<string, number>, t) => {
        acc[t.issueType] = (acc[t.issueType] || 0) + 1;
        return acc;
    }, {});

    const prevTypes = prevYearTickets.reduce((acc: Record<string, number>, t) => {
        acc[t.issueType] = (acc[t.issueType] || 0) + 1;
        return acc;
    }, {});

    const incidentsByType = Object.keys({ ...currentTypes, ...prevTypes }).map(type => ({
        type,
        count: currentTypes[type] || 0,
        prevCount: prevTypes[type] || 0
    })).sort((a, b) => b.count - a.count);

    const allIncidents = currentYearTickets;

    // By Month
    const incidentsByMonth = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return {
            month: m,
            count: allIncidents.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m).length
        };
    });

    // By Component
    const incidentsByComponent = Object.entries(
        allIncidents.reduce((acc, t) => {
            const comp = t.component || 'Sin componente';
            acc[comp] = (acc[comp] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    ).map(([component, count]) => ({ component, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

    // === SLA COMPLIANCE ===

    // Use SLA fields from Ticket model
    const firstResponseValid = allIncidents.filter(t => t.slaResponse).length;
    const firstResponseCompliant = allIncidents.filter(t =>
        t.slaResponse?.toLowerCase().trim() === 'cumplido'
    ).length;

    const resolutionValid = allIncidents.filter(t => t.slaResolution).length;
    const resolutionCompliant = allIncidents.filter(t =>
        t.slaResolution?.toLowerCase().trim() === 'cumplido'
    ).length;

    // Calculate avg times
    const parseTime = (timeStr: string | null) => {
        if (!timeStr) return 0;
        const val = parseFloat(timeStr);
        return isNaN(val) ? 0 : val;
    };

    const avgResponseTime = firstResponseValid > 0
        ? allIncidents.reduce((sum, t) => sum + parseTime(t.slaResponseTime), 0) / firstResponseValid
        : 0;

    const avgResolutionTime = resolutionValid > 0
        ? allIncidents.reduce((sum, t) => sum + parseTime(t.slaResolutionTime), 0) / resolutionValid
        : 0;

    const slaMetrics = {
        firstResponse: {
            total: firstResponseValid,
            compliant: firstResponseCompliant,
            avgTime: avgResponseTime
        },
        resolution: {
            total: resolutionValid,
            compliant: resolutionCompliant,
            avgTime: avgResolutionTime
        }
    };

    const slaFirstResponseCompliance = firstResponseValid > 0
        ? (firstResponseCompliant / firstResponseValid) * 100
        : 0;
    const slaResolutionCompliance = resolutionValid > 0
        ? (resolutionCompliant / resolutionValid) * 100
        : 0;

    const allClientsFull = await prisma.client.findMany({
        where: { id: { in: clientsListIds }, isDemo: false },
        select: { id: true, name: true, createdAt: true }
    });

    const newClientsArray: Array<{ id: string; name: string; firstTicketDate: Date }> = [];
    for (const client of allClientsFull) {
        const firstTicketEver = await prisma.ticket.findFirst({
            where: { workPackage: { clientId: client.id } },
            orderBy: { createdDate: 'asc' },
            select: { createdDate: true }
        });

        if (firstTicketEver && firstTicketEver.createdDate >= start && firstTicketEver.createdDate <= end) {
            newClientsArray.push({
                id: client.id,
                name: client.name,
                firstTicketDate: firstTicketEver.createdDate
            });
        }
    }

    // === CORRECTIVE METRICS ===
    const mttrValue = avgResolutionTime;
    const allTransitions = await prisma.ticketStatusHistory.findMany({
        where: {
            issueKey: { in: allIncidents.map(i => i.issueKey) },
            transitionDate: { gte: start, lte: end }
        },
        orderBy: { transitionDate: 'asc' }
    });

    const reopenedSet = new Set<string>();
    const closedStatusNames = ['cerrado', 'resuelto', 'done', 'finalizado', 'finished'];
    const activeStatusNames = ['abierto', 'en curso', 'en progreso', 'en tratamiento', 'pendiente cliente'];

    const ticketHistories: Record<string, string[]> = {};
    allTransitions.forEach(t => {
        if (!ticketHistories[t.issueKey]) ticketHistories[t.issueKey] = [];
        ticketHistories[t.issueKey].push(t.status.toLowerCase());
    });

    Object.entries(ticketHistories).forEach(([key, statuses]) => {
        for (let i = 1; i < statuses.length; i++) {
            const prev = statuses[i - 1];
            const curr = statuses[i];
            if (closedStatusNames.some(s => prev.includes(s)) && activeStatusNames.some(s => curr.includes(s))) {
                reopenedSet.add(key);
            }
        }
    });

    const reopenRateValue = totalIncidents > 0 ? (reopenedSet.size / totalIncidents) * 100 : 0;
    const backlogTickets = allIncidents.filter(t =>
        !['cerrado', 'resuelto', 'done', 'finalizado', 'finished'].includes(t.status.toLowerCase()) &&
        !['hito evolutivo', 'hitos evolutivos'].includes(t.issueType?.toLowerCase())
    );
    const backlogCount = backlogTickets.length;

    const backlogByType: Record<string, Record<string, { name: string, count: number }>> = {};
    backlogTickets.forEach(t => {
        const type = t.issueType || 'Otros';
        const clientName = t.workPackage.clientName;
        const clientId = t.workPackage.clientId;

        if (!backlogByType[type]) backlogByType[type] = {};
        if (!backlogByType[type][clientId]) backlogByType[type][clientId] = { name: clientName, count: 0 };
        backlogByType[type][clientId].count++;
    });

    const backlogDetails = Object.entries(backlogByType).map(([type, clients]) => ({
        type,
        count: Object.values(clients).reduce((acc, c) => acc + c.count, 0),
        byClient: Object.entries(clients).map(([id, data]) => ({
            id,
            name: data.name,
            count: data.count
        })).sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.count - a.count);

    const clientList = allClientsFull.map(c => ({
        id: c.id,
        name: c.name,
        isNew: newClientsArray.some(nc => nc.id === c.id)
    })).sort((a, b) => a.name.localeCompare(b.name));

    // === SATISFACTION (cf[10027]) ===
    // We will fetch satisfaction from Jira as it's not fully in DB
    const getSatisfactionData = async (y: number) => {
        const s = new Date(`${y}-01-01`).toISOString().split('T')[0];
        const e = new Date(`${y}-12-31`).toISOString().split('T')[0];

        const jiraUrl = process.env.JIRA_URL;
        const jiraEmail = process.env.JIRA_USER_EMAIL;
        const jiraToken = process.env.JIRA_API_TOKEN;
        const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

        // Satisfaction is cf[10027]
        const jql = `created >= "${s}" AND created <= "${e}" AND cf[10027] IS NOT EMPTY`;

        try {
            const response = await fetch(`${jiraUrl}/rest/api/3/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jql,
                    maxResults: 1000,
                    fields: ['issuetype', 'components', 'cf[10027]', 'created']
                })
            });

            if (!response.ok) return [];
            const data = await response.json();
            return data.issues || [];
        } catch (err) {
            console.error("Error fetching satisfaction:", err);
            return [];
        }
    };

    const currentYearSatTickets = await getSatisfactionData(year);
    const prevYearSatTickets = await getSatisfactionData(year - 1);

    const calcAvg = (tickets: any[]) => {
        if (tickets.length === 0) return null;
        const sum = tickets.reduce((acc, t) => acc + (t.fields.customfield_10027 || 0), 0);
        return sum / tickets.length;
    };

    const satisfactionMetrics = {
        globalAvg: calcAvg(currentYearSatTickets),
        prevYearAvg: calcAvg(prevYearSatTickets),
        byType: [] as Array<{ type: string, avg: number, count: number }>,
        byTeam: [] as Array<{ team: string, avg: number, count: number }>
    };

    // Grouping for breakdown
    const typeGroups: Record<string, { sum: number, count: number }> = {};
    const teamGroups: Record<string, { sum: number, count: number }> = {};

    currentYearSatTickets.forEach((t: any) => {
        const val = t.fields.customfield_10027;
        const type = t.fields.issuetype?.name || 'Otro';
        const team = t.fields.components?.[0]?.name || 'Sin equipo';

        if (!typeGroups[type]) typeGroups[type] = { sum: 0, count: 0 };
        typeGroups[type].sum += val;
        typeGroups[type].count++;

        if (!teamGroups[team]) teamGroups[team] = { sum: 0, count: 0 };
        teamGroups[team].sum += val;
        teamGroups[team].count++;
    });

    satisfactionMetrics.byType = Object.entries(typeGroups).map(([type, data]) => ({
        type,
        avg: data.sum / data.count,
        count: data.count
    })).sort((a, b) => b.count - a.count);

    satisfactionMetrics.byTeam = Object.entries(teamGroups).map(([team, data]) => ({
        team,
        avg: data.sum / data.count,
        count: data.count
    })).sort((a, b) => b.count - a.count);

    const satData = {
        byMonth: Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const mTickets = currentYearSatTickets.filter((t: any) => new Date(t.fields.created).getUTCMonth() + 1 === m);
            return {
                month: m,
                avg: calcAvg(mTickets),
                count: mTickets.length
            };
        }),
        byClient: [] // Placeholder if needed
    };

    // === EVOLUTIVOS (DEFINITIONS 2026-01-29) ===
    // Solicitudes: Petición de Evolutivo created in year
    const solicitudesList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    // Enviadas: Petición de Evolutivo CLOSED in year
    const enviadasList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            status: { in: ['Cerrado', 'Resuelto', 'Resolved', 'Closed', 'Done'], mode: 'insensitive' },
            // We look at when it was closed, but Ticket model has year/month/createdDate.
            // Ideally we check transition date, but if not available, we use createdDate if it was closed soon,
            // or we approximate. Assuming the Ticket model's year/month reflects its current state if synced recently.
            year: year
        }
    });

    // Aprobadas: tickets of type "Evolutivo" created in the year
    const aprobadasList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    const solicitudesCount = solicitudesList.length;
    const enviadasCount = enviadasList.length;
    const aprobadasCount = aprobadasList.length;

    const acceptanceRatioVal = enviadasCount > 0 ? (aprobadasCount / enviadasCount) * 100 : 0;

    // === CLIENT KPI (NEW REQUEST) ===
    const getClientsForYear = async (y: number) => {
        const s = new Date(`${y}-01-01T00:00:00Z`);
        const e = new Date(`${y}-12-31T23:59:59Z`);

        const vps = await prisma.validityPeriod.findMany({
            where: {
                OR: [
                    { startDate: { lte: e }, endDate: { gte: s } }
                ]
            },
            select: { workPackage: { select: { clientId: true, clientName: true } } }
        });

        const clientMap = new Map<string, string>();
        vps.forEach(vp => {
            clientMap.set(vp.workPackage.clientId, vp.workPackage.clientName);
        });

        return clientMap;
    };

    const clientsTargetYear = await getClientsForYear(year);
    const clientsPrevYear = await getClientsForYear(year - 1);

    const clientsKPIList = Array.from(clientsTargetYear.entries()).map(([id, name]) => ({
        id,
        name,
        isNew: !clientsPrevYear.has(id)
    })).sort((a, b) => a.name.localeCompare(b.name));

    const totalClients = clientsKPIList.length;
    const newClientsCount = clientsKPIList.filter(c => c.isNew).length;
    const prevTotalCount = clientsPrevYear.size;
    const clientsGrowthRel = prevTotalCount > 0 ? (newClientsCount / prevTotalCount) * 100 : (newClientsCount > 0 ? 100 : 0);

    const clientsKPI = {
        total: totalClients,
        newAbsolute: newClientsCount,
        growthRelative: clientsGrowthRel,
        details: clientsKPIList
    };

    // === NEW KPI: CLIENTS BY CONTRACT TYPE ===
    const contractClientsMap = new Map<string, Set<string>>();
    const contractDetails: Array<{ clientId: string; clientName: string; type: string }> = [];

    const activeWps = await prisma.workPackage.findMany({
        where: {
            validityPeriods: {
                some: {
                    OR: [
                        { startDate: { lte: end }, endDate: { gte: start } }
                    ]
                }
            }
        },
        select: {
            clientId: true,
            clientName: true,
            contractType: true
        }
    });

    activeWps.forEach(wp => {
        const type = wp.contractType.toUpperCase() === 'BD' ? 'BAJO DEMANDA' : wp.contractType.toUpperCase();
        if (!contractClientsMap.has(type)) contractClientsMap.set(type, new Set());
        contractClientsMap.get(type)?.add(wp.clientId);

        if (!contractDetails.some(d => d.clientId === wp.clientId && d.type === type)) {
            contractDetails.push({ clientId: wp.clientId, clientName: wp.clientName, type });
        }
    });

    const contractClientsKPI = {
        types: Array.from(contractClientsMap.entries()).map(([type, clients]) => ({
            type,
            count: clients.size
        })),
        details: contractDetails
    };

    // === NEW KPI: CONTRACTED HOURS ===
    const vpsForYear = await prisma.validityPeriod.findMany({
        where: {
            OR: [
                { startDate: { lte: end }, endDate: { gte: start } }
            ],
            workPackage: {
                NOT: { contractType: { equals: 'EVENTOS', mode: 'insensitive' } }
            }
        },
        include: {
            workPackage: {
                select: { id: true, name: true, contractType: true }
            }
        }
    });

    // Pro-rata hours calculation based on billingType
    let contractedTotal = 0;

    // Auxiliary for months diff
    const diffMonths = (d1: Date, d2: Date) => {
        return (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth()) + 1;
    };

    vpsForYear.forEach(vp => {
        const vpStart = new Date(vp.startDate);
        const vpEnd = new Date(vp.endDate);
        const overlapStart = new Date(Math.max(vpStart.getTime(), start.getTime()));
        const overlapEnd = new Date(Math.min(vpEnd.getTime(), end.getTime()));

        if (overlapStart <= overlapEnd) {
            if (vp.billingType?.toUpperCase() === 'MENSUAL' || vp.billingType?.toUpperCase() === 'MONTHLY') {
                const totalMonthsOfPeriod = diffMonths(vpStart, vpEnd);
                const overlapMonthsInYear = diffMonths(overlapStart, overlapEnd);

                // Pro-rata: (Total Quantity / Total Months) * Overlap Months
                const monthlyHours = totalMonthsOfPeriod > 0 ? vp.totalQuantity / totalMonthsOfPeriod : 0;
                contractedTotal += monthlyHours * overlapMonthsInYear;
            } else {
                // One-time or "PUNTUAL" billing: count the whole amount in the target year
                contractedTotal += vp.totalQuantity;
            }
        }
    });

    // Regularizations: Sum EXCESO_CONSUMO (EXCESS in DB)
    const yearRegs = await prisma.regularization.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            date: { gte: start, lte: end },
            type: { in: ['EXCESS', 'EXCESO_CONSUMO'], mode: 'insensitive' }
        }
    });
    const regularizationsTotal = yearRegs.reduce((sum, r) => sum + r.quantity, 0);

    // Sum of regularizations per WorkPackage for the detail table
    const regsByWP = yearRegs.reduce((acc, r) => {
        acc[r.workPackageId] = (acc[r.workPackageId] || 0) + r.quantity;
        return acc;
    }, {} as Record<string, number>);

    // Unconsumed hours
    const yearMonthlyMetrics = await prisma.monthlyMetric.findMany({
        where: {
            year: year,
            workPackage: {
                NOT: { contractType: { equals: 'EVENTOS', mode: 'insensitive' } }
            }
        }
    });

    const consumedByWp = yearMonthlyMetrics.reduce((acc, m) => {
        acc[m.workPackageId] = (acc[m.workPackageId] || 0) + m.consumedHours;
        return acc;
    }, {} as Record<string, number>);

    const breakdownByWP = vpsForYear.map(vp => {
        const consumed = consumedByWp[vp.workPackageId] || 0;
        const excess = regsByWP[vp.workPackageId] || 0;

        // Final contracted for this WP in the table should include its excess
        let wpContracted = 0;
        const vpStart = new Date(vp.startDate);
        const vpEnd = new Date(vp.endDate);
        const overlapStart = new Date(Math.max(vpStart.getTime(), start.getTime()));
        const overlapEnd = new Date(Math.min(vpEnd.getTime(), end.getTime()));

        if (vp.billingType?.toUpperCase() === 'MENSUAL' || vp.billingType?.toUpperCase() === 'MONTHLY') {
            const totalMonthsOfPeriod = diffMonths(vpStart, vpEnd);
            const overlapMonthsInYear = diffMonths(overlapStart, overlapEnd);
            wpContracted = totalMonthsOfPeriod > 0 ? (vp.totalQuantity / totalMonthsOfPeriod) * overlapMonthsInYear : 0;
        } else {
            wpContracted = vp.totalQuantity;
        }

        const totalWpContracted = wpContracted + excess;

        return {
            name: vp.workPackage.name,
            type: vp.workPackage.contractType,
            contracted: totalWpContracted,
            consumed: consumed,
            remaining: Math.max(0, totalWpContracted - consumed)
        };
    });

    const unconsumedTotal = breakdownByWP.reduce((sum, item) => sum + item.remaining, 0);

    const contractedHoursKPI = {
        total: contractedTotal, // This is the pro-rata base total
        regularizationsTotal,
        unconsumedTotal,
        breakdownByWP: breakdownByWP.sort((a, b) => b.contracted - a.contracted)
    };

    // === EMPLOYEE KPI (TEMPO + DB Fallback) ===
    let employeesKPI = {
        total: 0,
        growthAbs: 0,
        growthRel: 0,
        teamsBreakdown: [] as any[]
    };

    try {
        // Fallback or Source: Local DB Teams (which should match Tempo)
        const dbTeams = await prisma.team.findMany({
            where: { name: { startsWith: 'AMA' } },
            include: { members: true }
        });

        // Current staffing from DB
        const totalYear = dbTeams.reduce((sum, t) => sum + t.members.length, 0);

        // Mock or calculate previous staffing (we might not have historical team counts easily, 
        // so we'll use a placeholder or try to infer from Tempo if available)
        let totalPrev = totalYear; // Default to same if unknown

        // Try Tempo for growth details
        try {
            const teamsRes = await fetchTempo("/teams");
            const tempoTeams = (teamsRes.results || []).filter((t: any) => t.name.startsWith("AMA"));

            for (const team of tempoTeams) {
                // Correct endpoint for Tempo Cloud memberships is usually /team-memberships/team/{id}
                const membershipsRes = await fetchTempo(`/team-memberships/team/${team.id}`);
                const membershipsList = membershipsRes.results || membershipsRes || [];

                let teamTotalYear = 0;
                let teamTotalPrev = 0;

                // Track unique persons per period
                const personsInYear = new Set<string>();
                const personsInPrev = new Set<string>();

                const yearStart = new Date(`${year}-01-01`).getTime();
                const yearEnd = new Date(`${year}-12-31`).getTime();
                const prevStart = new Date(`${year - 1}-01-01`).getTime();
                const prevEnd = new Date(`${year - 1}-12-31`).getTime();

                membershipsList.forEach((ms: any) => {
                    // Structure is { from, to, member: { accountId } }
                    const rawFrom = ms.from || ms.membership?.from;
                    const rawTo = ms.to || ms.membership?.to;

                    const msFrom = new Date(rawFrom).getTime();
                    // If to is null, it's an active membership
                    const msTo = rawTo ? new Date(rawTo).getTime() : new Date('2099-12-31').getTime();
                    const accountId = ms.member?.accountId || ms.accountId;

                    if (accountId) {
                        if (msFrom <= yearEnd && msTo >= yearStart) personsInYear.add(accountId);
                        if (msFrom <= prevEnd && msTo >= prevStart) personsInPrev.add(accountId);
                    }
                });

                teamTotalYear = personsInYear.size;
                teamTotalPrev = personsInPrev.size;

                employeesKPI.teamsBreakdown.push({
                    teamName: team.name,
                    count: teamTotalYear,
                    prevCount: teamTotalPrev,
                    growthAbs: teamTotalYear - teamTotalPrev,
                    growthRel: teamTotalPrev > 0 ? ((teamTotalYear - teamTotalPrev) / teamTotalPrev) * 100 : 0
                });
            }

            // If Tempo worked, we use its totals for percentages
            const tempoTotalYear = employeesKPI.teamsBreakdown.reduce((sum, t) => sum + t.count, 0);
            const tempoTotalPrev = employeesKPI.teamsBreakdown.reduce((sum, t) => sum + t.prevCount, 0);

            employeesKPI.total = tempoTotalYear;
            employeesKPI.growthAbs = tempoTotalYear - tempoTotalPrev;
            employeesKPI.growthRel = tempoTotalPrev > 0 ? (employeesKPI.growthAbs / tempoTotalPrev) * 100 : 0;

            // Log for debugging since dashboard shows 0.0%
            console.log(`Team Counts: Year=${tempoTotalYear}, Prev=${tempoTotalPrev}, Growth=${employeesKPI.growthAbs}`);
        } catch (tempoErr) {
            // If Tempo fails, use DB totals
            employeesKPI.total = totalYear;
            // (Growth will be 0 as we don't have historical DB teams easily available here)
        }

        // Final sanity check: if list is empty but we have DB teams
        if (employeesKPI.teamsBreakdown.length === 0 && dbTeams.length > 0) {
            employeesKPI.teamsBreakdown = dbTeams.map(t => ({
                teamName: t.name,
                count: t.members.length,
                prevCount: t.members.length,
                growthAbs: 0,
                growthRel: 0
            }));
            employeesKPI.total = totalYear;
        }

    } catch (err) {
        console.error("Error calculating employees KPI:", err);
    }

    // === MONTHLY BREAKDOWN & BACKLOG ===
    // Accumulated backlog: Tickets open at the end of each month
    // We approximate this by: created <= month_end AND (closed > month_end OR resolution IS NULL)
    const monthlyData = await Promise.all(Array.from({ length: 12 }, async (_, i) => {
        const m = i + 1;
        const monthEnd = new Date(year, m, 0, 23, 59, 59);

        const mInc = allIncidents.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m);
        const mEvos = aprobadasList.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m);

        const mSlaT = mInc.filter(t => t.slaResolution).length;
        const mSlaC = mInc.filter(t => t.slaResolution?.toLowerCase() === 'cumplido').length;
        const mSlaComp = mSlaT > 0 ? (mSlaC / mSlaT) * 100 : 0;

        // Satisfaction for the month
        const mSatTickets = currentYearSatTickets.filter((t: any) => new Date(t.fields.created).getUTCMonth() + 1 === m);
        const mSatAvg = calcAvg(mSatTickets);

        // Accumulated backlog calculation
        // A ticket is in backlog for month M if it was created before or during M,
        // and it was either never closed OR closed after month M.
        const monthBacklog = await prisma.ticket.count({
            where: {
                createdDate: { lte: monthEnd },
                NOT: {
                    issueType: { in: ['Evolutivo', 'Petición de Evolutivo', 'Hito evolutivo', 'Hitos Evolutivos', 'Tarea', 'Sub-Tarea', 'Sub-task', 'Task'], mode: 'insensitive' }
                },
                OR: [
                    { resolution: { equals: null } },
                    { resolution: { equals: '' } },
                    { status: { notIn: ['Cerrado', 'Resuelto', 'Resolved', 'Closed', 'Done'], mode: 'insensitive' } }
                ]
            }
        });

        return {
            month: m,
            incidents: mInc.length,
            evolutivos: mEvos.length,
            slaCompliance: mSlaComp,
            satisfaction: mSatAvg,
            backlog: monthBacklog
        };
    }));

    return {
        totalIncidents,
        prevYearIncidents,
        slaFirstResponseCompliance,
        slaResolutionCompliance,
        avgSatisfaction: satisfactionMetrics.globalAvg,
        clientsKPI,
        employeesKPI,
        contractClientsKPI,
        contractedHoursKPI,
        evolutivos: {
            creados: aprobadasCount,
            entregados: aprobadasCount,
            solicitadas: solicitudesCount,
            enviadas: enviadasCount,
            aprobadas: aprobadasCount,
            ratioAceptacion: acceptanceRatioVal,
            ratioEnvio: 100 // placeholder
        },
        incidentsByType,
        incidentsByMonth,
        incidentsByComponent,
        slaMetrics,
        clients: {
            total: clientsKPI.total,
            newClients: newClientsArray,
            clientList: clientList
        },
        correctiveMetrics: {
            mttr: avgResolutionTime,
            reopenRate: 0,
            backlog: monthlyData[11].backlog, // Backlog at year end
            backlogDetails
        },
        satisfaction: satData,
        monthly: monthlyData,
        satisfactionMetrics
    };
}
