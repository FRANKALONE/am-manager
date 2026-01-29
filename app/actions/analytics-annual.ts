// app/actions/analytics-annual.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { fetchTempo } from '@/lib/tempo';

export interface AnnualReportData {
    // Executive Summary
    totalIncidents: number;
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
    incidentsByType: Array<{ type: string; count: number }>;
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
    }>;
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

    // Exclude Evolutivo types
    const incidentTypes = ['Bug', 'Incidencia', 'Consulta', 'Tarea', 'Subtarea', 'Servicio', 'Problema'];

    const allIncidents = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            createdDate: { gte: start, lte: end },
            NOT: {
                issueType: { in: ['Evolutivo', 'Petición de Evolutivo', 'Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
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

    const totalIncidents = allIncidents.length;

    // By Type
    const incidentsByType = Object.entries(
        allIncidents.reduce((acc, t) => {
            acc[t.issueType] = (acc[t.issueType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    ).map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

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

    const satData = {
        byMonth: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            avg: null as number | null,
            count: 0
        })),
        byClient: allClientsFull.map(c => ({
            clientId: c.id,
            clientName: c.name,
            avg: null as number | null,
            count: 0
        }))
    };

    // === EVOLUTIVOS ===
    const evolutivosList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        },
        select: { issueKey: true, createdDate: true }
    });

    const peticionesList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        },
        select: { issueKey: true, createdDate: true }
    });

    const proTrans = await prisma.ticketStatusHistory.findMany({
        where: {
            status: { in: ['Entregado en PRD', 'ENTREGADO EN PRO', 'Entregado en PRO'], mode: 'insensitive' },
            transitionDate: { gte: start, lte: end }
        }
    });

    const validProEvos = evolutivosList.filter(e => proTrans.some(tr => tr.issueKey === e.issueKey));

    const sentTrans = await prisma.ticketStatusHistory.findMany({
        where: {
            status: {
                in: ['Oferta Generada', 'Oferta enviada al cliente', 'Oferta enviada al gerente'],
                mode: 'insensitive'
            },
            transitionDate: { gte: start, lte: end }
        }
    });

    const uniqueSentEvoKeys = new Set(
        sentTrans
            .filter(tr => peticionesList.some(p => p.issueKey === tr.issueKey))
            .map(tr => tr.issueKey)
    );

    const approvedPeticionesList = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            status: { equals: 'Cerrado', mode: 'insensitive' },
            resolution: { in: ['Aprobada', 'Aprobado'], mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    const acceptanceRatioVal = uniqueSentEvoKeys.size > 0 ? (approvedPeticionesList.length / uniqueSentEvoKeys.size) * 100 : 0;
    const sentRatioVal = peticionesList.length > 0 ? (uniqueSentEvoKeys.size / peticionesList.length) * 100 : 0;

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

    // === EMPLOYEE KPI (TEMPO) ===
    let employeesKPI = {
        total: 0,
        growthAbs: 0,
        growthRel: 0,
        teamsBreakdown: [] as any[]
    };

    try {
        const teamsRes = await fetchTempo("/teams");
        const tempoTeams = (teamsRes.results || []).filter((t: any) => t.name.startsWith("AMA"));

        let totalYear = 0;
        let totalPrev = 0;

        for (const team of tempoTeams) {
            const membersRes = await fetchTempo(`/teams/${team.id}/members`);
            const members = membersRes.results || [];

            let teamTotalYear = 0;
            let teamTotalPrev = 0;

            const yearStart = new Date(`${year}-01-01`).getTime();
            const yearEnd = new Date(`${year}-12-31`).getTime();
            const prevStart = new Date(`${year - 1}-01-01`).getTime();
            const prevEnd = new Date(`${year - 1}-12-31`).getTime();

            members.forEach((m: any) => {
                const memberships = m.memberships?.values || [];
                let inYear = false;
                let inPrev = false;

                memberships.forEach((ms: any) => {
                    const msFrom = new Date(ms.from).getTime();
                    const msTo = ms.to ? new Date(ms.to).getTime() : new Date('2099-12-31').getTime();

                    // Check overlap with Target Year
                    if (msFrom <= yearEnd && msTo >= yearStart) inYear = true;
                    // Check overlap with Previous Year
                    if (msFrom <= prevEnd && msTo >= prevStart) inPrev = true;
                });

                if (inYear) teamTotalYear++;
                if (inPrev) teamTotalPrev++;
            });

            const teamGrowthAbs = teamTotalYear - teamTotalPrev;
            const teamGrowthRel = teamTotalPrev > 0 ? (teamGrowthAbs / teamTotalPrev) * 100 : (teamTotalYear > 0 ? 100 : 0);

            employeesKPI.teamsBreakdown.push({
                teamName: team.name,
                count: teamTotalYear,
                prevCount: teamTotalPrev,
                growthAbs: teamGrowthAbs,
                growthRel: teamGrowthRel
            });

            totalYear += teamTotalYear;
            totalPrev += teamTotalPrev;
        }

        employeesKPI.total = totalYear;
        employeesKPI.growthAbs = totalYear - totalPrev;
        employeesKPI.growthRel = totalPrev > 0 ? (employeesKPI.growthAbs / totalPrev) * 100 : (totalYear > 0 ? 100 : 0);

    } catch (err) {
        console.error("Error calculating employees KPI:", err);
    }

    // === MONTHLY BREAKDOWN ===
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const mInc = allIncidents.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m);
        const mEvos = evolutivosList.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m);

        const mSlaT = mInc.filter(t => t.slaResolution).length;
        const mSlaC = mInc.filter(t => t.slaResolution?.toLowerCase() === 'cumplido').length;
        const mSlaComp = mSlaT > 0 ? (mSlaC / mSlaT) * 100 : 0;

        return {
            month: m,
            incidents: mInc.length,
            evolutivos: mEvos.length,
            slaCompliance: mSlaComp,
            satisfaction: null as number | null
        };
    });

    return {
        totalIncidents,
        slaFirstResponseCompliance,
        slaResolutionCompliance,
        avgSatisfaction: null,
        clientsKPI,
        employeesKPI,
        evolutivos: {
            creados: evolutivosList.length,
            entregados: validProEvos.length,
            solicitadas: peticionesList.length,
            enviadas: uniqueSentEvoKeys.size,
            aprobadas: approvedPeticionesList.length,
            ratioAceptacion: acceptanceRatioVal,
            ratioEnvio: sentRatioVal
        },
        incidentsByType,
        incidentsByMonth,
        incidentsByComponent,
        slaMetrics,
        clients: {
            total: allClientsFull.length,
            newClients: newClientsArray,
            clientList
        },
        correctiveMetrics: {
            mttr: mttrValue,
            reopenRate: reopenRateValue,
            backlog: backlogCount,
            backlogDetails
        },
        satisfaction: satData,
        monthly: monthlyData
    };
}
