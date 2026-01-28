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

    // Note: We don't have actual SLA fields populated, so we'll calculate based on resolution time
    // This is a simplified version - you may need to adjust based on actual SLA definitions

    const resolvedIncidents = allIncidents.filter(t =>
        t.status.toLowerCase() === 'cerrado' ||
        t.status.toLowerCase() === 'resuelto' ||
        t.status.toLowerCase() === 'done'
    );

    // Get resolution times from history
    const incidentKeys = allIncidents.map(t => t.issueKey);
    const statusHistory = await prisma.ticketStatusHistory.findMany({
        where: {
            issueKey: { in: incidentKeys },
            transitionDate: { gte: start, lte: end }
        },
        orderBy: { transitionDate: 'asc' }
    });

    // Calculate first response time (first status change after creation)
    const firstResponseTimes: Record<string, number> = {};
    const resolutionTimes: Record<string, number> = {};

    for (const incident of allIncidents) {
        const history = statusHistory.filter(h => h.issueKey === incident.issueKey);

        // First response: first transition
        if (history.length > 0) {
            const firstTransition = history[0];
            const responseTime = (firstTransition.transitionDate.getTime() - incident.createdDate.getTime()) / (1000 * 60 * 60); // hours
            firstResponseTimes[incident.issueKey] = responseTime;
        }

        // Resolution: last transition to closed status
        const closedTransition = history.find(h =>
            h.status.toLowerCase() === 'cerrado' ||
            h.status.toLowerCase() === 'resuelto' ||
            h.status.toLowerCase() === 'done'
        );
        if (closedTransition) {
            const resTime = (closedTransition.transitionDate.getTime() - incident.createdDate.getTime()) / (1000 * 60 * 60); // hours
            resolutionTimes[incident.issueKey] = resTime;
        }
    }

    // SLA thresholds (simplified - you may want to get these from WorkPackage)
    const SLA_FIRST_RESPONSE_HOURS = 24; // 24 hours
    const SLA_RESOLUTION_HOURS = 72; // 72 hours

    const firstResponseCompliant = Object.values(firstResponseTimes).filter(t => t <= SLA_FIRST_RESPONSE_HOURS).length;
    const resolutionCompliant = Object.values(resolutionTimes).filter(t => t <= SLA_RESOLUTION_HOURS).length;

    const slaMetrics = {
        firstResponse: {
            total: Object.keys(firstResponseTimes).length,
            compliant: firstResponseCompliant,
            avgTime: Object.values(firstResponseTimes).reduce((sum, t) => sum + t, 0) / Object.keys(firstResponseTimes).length || 0
        },
        resolution: {
            total: Object.keys(resolutionTimes).length,
            compliant: resolutionCompliant,
            avgTime: Object.values(resolutionTimes).reduce((sum, t) => sum + t, 0) / Object.keys(resolutionTimes).length || 0
        }
    };

    const slaFirstResponseCompliance = slaMetrics.firstResponse.total > 0
        ? (slaMetrics.firstResponse.compliant / slaMetrics.firstResponse.total) * 100
        : 0;
    const slaResolutionCompliance = slaMetrics.resolution.total > 0
        ? (slaMetrics.resolution.compliant / slaMetrics.resolution.total) * 100
        : 0;

    // === CLIENT ANALYSIS ===

    const allClients = await prisma.client.findMany({
        where: { id: { in: clientsListIds }, isDemo: false },
        select: { id: true, name: true, createdAt: true }
    });

    // Find new clients (first ticket in the year)
    const newClients: Array<{ id: string; name: string; firstTicketDate: Date }> = [];

    for (const client of allClients) {
        const firstTicket = await prisma.ticket.findFirst({
            where: { workPackage: { clientId: client.id } },
            orderBy: { createdDate: 'asc' },
            select: { createdDate: true }
        });

        if (firstTicket && firstTicket.createdDate >= start && firstTicket.createdDate <= end) {
            newClients.push({
                id: client.id,
                name: client.name,
                firstTicketDate: firstTicket.createdDate
            });
        }
    }

    // === CORRECTIVE METRICS ===

    // MTTR: Mean Time To Repair
    const mttr = Object.values(resolutionTimes).reduce((sum, t) => sum + t, 0) / Object.keys(resolutionTimes).length || 0;

    // Reopen Rate: tickets that were reopened
    const reopenedTickets = statusHistory.filter(h => {
        const prevStatus = statusHistory.find(prev =>
            prev.issueKey === h.issueKey &&
            prev.transitionDate < h.transitionDate &&
            (prev.status.toLowerCase() === 'cerrado' || prev.status.toLowerCase() === 'resuelto')
        );
        return prevStatus && h.status.toLowerCase() !== 'cerrado' && h.status.toLowerCase() !== 'resuelto';
    });
    const reopenRate = totalIncidents > 0 ? (reopenedTickets.length / totalIncidents) * 100 : 0;

    // Backlog: pending tickets at end of year
    const backlog = allIncidents.filter(t =>
        t.status.toLowerCase() !== 'cerrado' &&
        t.status.toLowerCase() !== 'resuelto' &&
        t.status.toLowerCase() !== 'done'
    ).length;

    // === SATISFACTION ===

    // Note: Schema doesn't have customerSatisfaction field in Ticket
    // This is a placeholder - you'll need to adjust based on actual data source

    const satisfaction = {
        byMonth: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            avg: null as number | null,
            count: 0
        })),
        byClient: allClients.map(c => ({
            clientId: c.id,
            clientName: c.name,
            avg: null as number | null,
            count: 0
        }))
    };

    // === EVOLUTIVOS (from existing dashboard) ===

    const evolutivos = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        },
        select: { issueKey: true, createdDate: true }
    });

    const peticionesEvolutivo = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        },
        select: { issueKey: true }
    });

    const proTransitions = await prisma.ticketStatusHistory.findMany({
        where: {
            status: { equals: 'Entregado en PRO', mode: 'insensitive' },
            transitionDate: { gte: start, lte: end }
        }
    });

    const sentTransitions = await prisma.ticketStatusHistory.findMany({
        where: {
            status: {
                in: ['Oferta Generada', 'Oferta enviada al cliente', 'Oferta enviada al gerente'],
                mode: 'insensitive'
            },
            transitionDate: { gte: start, lte: end }
        }
    });

    const sentPeticiones = await prisma.ticket.findMany({
        where: {
            issueKey: { in: sentTransitions.map(t => t.issueKey) },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
        }
    });

    const uniqueSent = new Set(sentPeticiones.map(p => p.issueKey)).size;

    const approvedPeticiones = await prisma.ticket.findMany({
        where: {
            workPackage: { clientId: { in: clientsListIds } },
            issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
            status: { equals: 'Cerrado', mode: 'insensitive' },
            resolution: { equals: 'Aprobada', mode: 'insensitive' },
            createdDate: { gte: start, lte: end }
        }
    });

    const ratioAceptacion = uniqueSent > 0 ? (approvedPeticiones.length / uniqueSent) * 100 : 0;
    const ratioEnvio = peticionesEvolutivo.length > 0 ? (uniqueSent / peticionesEvolutivo.length) * 100 : 0;

    // === MONTHLY BREAKDOWN ===

    const monthly = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return {
            month: m,
            incidents: allIncidents.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m).length,
            evolutivos: evolutivos.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m).length,
            slaCompliance: 0, // Placeholder - would need monthly SLA calculation
            satisfaction: null as number | null
        };
    });

    return {
        totalIncidents,
        slaFirstResponseCompliance,
        slaResolutionCompliance,
        avgSatisfaction: null, // Placeholder
        evolutivos: {
            creados: evolutivos.length,
            entregados: proTransitions.length,
            solicitadas: peticionesEvolutivo.length,
            enviadas: uniqueSent,
            aprobadas: approvedPeticiones.length,
            ratioAceptacion,
            ratioEnvio
        },
        incidentsByType,
        incidentsByMonth,
        incidentsByComponent,
        slaMetrics,
        clients: {
            total: allClients.length,
            newClients
        },
        correctiveMetrics: {
            mttr,
            reopenRate,
            backlog
        },
        satisfaction,
        monthly
    };
}
