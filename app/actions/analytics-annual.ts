// app/actions/analytics-annual.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export interface AnnualReportData {
    // Executive Summary
    totalIncidents: number;
    slaFirstResponseCompliance: number;
    slaResolutionCompliance: number;
    avgSatisfaction: number | null;

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

    // Client Analysis
    clients: {
        total: number;
        newClients: Array<{ id: string; name: string; firstTicketDate: Date }>;
    };

    // Corrective Metrics
    correctiveMetrics: {
        mttr: number; // Mean Time To Repair (hours)
        reopenRate: number; // percentage
        backlog: number; // pending tickets
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

    // === CLIENT ANALYSIS ===

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

    // MTTR: Mean Time To Repair
    const mttrValue = avgResolutionTime;

    // Reopen Rate: Transitions from a closed state to an active state
    // We already have reopenedTicketKeys logic idea, let's refine the query
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

    // Group by issueKey
    const ticketHistories: Record<string, string[]> = {};
    allTransitions.forEach(t => {
        if (!ticketHistories[t.issueKey]) ticketHistories[t.issueKey] = [];
        ticketHistories[t.issueKey].push(t.status.toLowerCase());
    });

    Object.entries(ticketHistories).forEach(([key, statuses]) => {
        for (let i = 1; i < statuses.length; i++) {
            const prev = statuses[i - 1];
            const curr = statuses[i];
            if (closedStatusNames.some(s => prev.includes(s)) &&
                activeStatusNames.some(s => curr.includes(s))) {
                reopenedSet.add(key);
            }
        }
    });

    const reopenRateValue = totalIncidents > 0 ? (reopenedSet.size / totalIncidents) * 100 : 0;

    // Backlog
    const backlogCount = allIncidents.filter(t =>
        !['cerrado', 'resuelto', 'done', 'finalizado', 'finished'].includes(t.status.toLowerCase())
    ).length;

    // === SATISFACTION ===
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
            newClients: newClientsArray
        },
        correctiveMetrics: {
            mttr: mttrValue,
            reopenRate: reopenRateValue,
            backlog: backlogCount
        },
        satisfaction: satData,
        monthly: monthlyData
    };
}
