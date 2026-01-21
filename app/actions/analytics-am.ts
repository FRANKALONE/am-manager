"use server";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function getAmManagementReport(year: number, clientId?: string) {
    const session = await getAuthSession();
    if (!session) throw new Error("Unauthorized");

    const excludedClientName = "TRANSCOM";
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    const prevYear = year - 1;
    const prevStartDate = new Date(`${prevYear}-01-01T00:00:00Z`);
    const prevEndDate = new Date(`${prevYear}-12-31T23:59:59Z`);

    // 1. Fetch relevant clients (Exclude TRANSCOM)
    const clients = await prisma.client.findMany({
        where: {
            name: { not: excludedClientName },
            id: clientId || undefined
        },
        select: { id: true, name: true }
    });
    const clientIds = clients.map(c => c.id);

    // HELPER: Fetch metrics for a specific time range
    async function fetchYearlyMetrics(start: Date, end: Date, clientsListIds: string[]) {
        // TICKETS (Metric 1, 2, 3, 8)
        const tickets = await prisma.ticket.findMany({
            where: {
                workPackage: { clientId: { in: clientsListIds } },
                createdDate: { gte: start, lte: end }
            },
            include: {
                workPackage: { select: { clientId: true, clientName: true, contractType: true, billingType: true } }
            }
        });

        // Metrics for tickets
        const evolutivosCreados = tickets.filter(t => t.issueType === 'Evolutivo');

        // Metric 2: Entregados en PRO (Historical status check)
        const proTransitions = await (prisma as any).ticketStatusHistory.findMany({
            where: {
                type: 'TICKET',
                status: 'ENTREGADO EN PRO',
                transitionDate: { gte: start, lte: end },
                ticket: { workPackage: { clientId: { in: clientsListIds } } }
            },
            include: {
                ticket: { select: { issueType: true } }
            }
        });
        const evolutivosEntregadosPro = proTransitions.filter((tr: any) => tr.ticket.issueType === 'Evolutivo');

        // Metric 3: Evolutivo Medio (Hours)
        // Tickets tipo Evolutivo, Facturable o Bolsa, estimación original.
        const facturableEvolutivos = evolutivosCreados.filter(t =>
            (t.workPackage.billingType === 'FACTURABLE' || t.workPackage.billingType === 'BOLSA') &&
            t.workPackage.contractType === 'EVOLUTIVOS'
        );
        const totalEstimatedHours = facturableEvolutivos.reduce((sum, t) => sum + (t.originalEstimate || 0), 0);
        const avgEstimatedHours = facturableEvolutivos.length > 0 ? totalEstimatedHours / facturableEvolutivos.length : 0;

        // PROPOSALS (Metric 4, 5, 6, 7, 9, 10)
        const proposals = await (prisma as any).evolutivoProposal.findMany({
            where: {
                clientId: { in: clientsListIds },
                createdDate: { gte: start, lte: end }
            }
        });

        // Metric 5: Ofertas Enviadas (Sent to Gerente or Sent to Client dates)
        const sentProposals = await (prisma as any).evolutivoProposal.findMany({
            where: {
                clientId: { in: clientsListIds },
                OR: [
                    { sentToGerenteDate: { gte: start, lte: end } },
                    { sentToClientDate: { gte: start, lte: end } }
                ]
            }
        });

        // Metric 6: Ofertas Aprobadas (CERRADO + Aprobada + Link to Ticket)
        const approvedProposals = await (prisma as any).evolutivoProposal.findMany({
            where: {
                clientId: { in: clientsListIds },
                status: 'CERRADO',
                resolution: 'Aprobada',
                ticketId: { not: null }, // Must have a related ticket
                approvedDate: { gte: start, lte: end }
            }
        });

        return {
            tickets: evolutivosCreados,
            delivered: evolutivosEntregadosPro,
            avgHours: avgEstimatedHours,
            totalHours: totalEstimatedHours,
            proposalsRequested: proposals,
            proposalsSent: sentProposals,
            proposalsApproved: approvedProposals,
            rawTickets: tickets // for top clients etc
        };
    }

    const currentYearMetrics = await fetchYearlyMetrics(startDate, endDate, clientIds);
    const prevYearMetrics = await fetchYearlyMetrics(prevStartDate, prevEndDate, clientIds);

    // Monthly breakdown for Current Year
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        return {
            month,
            creados: currentYearMetrics.tickets.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === month).length,
            entregados: currentYearMetrics.delivered.filter((d: any) => new Date(d.transitionDate).getUTCMonth() + 1 === month).length,
            requested: currentYearMetrics.proposalsRequested.filter((p: any) => new Date(p.createdDate).getUTCMonth() + 1 === month).length,
            sent: currentYearMetrics.proposalsSent.filter((p: any) => {
                const date = p.sentToClientDate || p.sentToGerenteDate;
                return date && new Date(date).getUTCMonth() + 1 === month;
            }).length
        };
    });

    // Top 10 Clients by Num Evolutivos (Metric 8)
    const clientStats = clients.map(c => {
        const clientTickets = currentYearMetrics.tickets.filter(t => t.workPackage.clientId === c.id);
        const volume = clientTickets.reduce((sum, t) => sum + (t.originalEstimate || 0), 0);

        // Metric 10: Ratio aceptación por cliente (Aprobadas vs Solicitadas)
        const requested = currentYearMetrics.proposalsRequested.filter((p: any) => p.clientId === c.id).length;
        const approved = currentYearMetrics.proposalsApproved.filter((p: any) => p.clientId === c.id).length;
        const acceptanceRatio = requested > 0 ? (approved / requested) * 100 : 0;

        return {
            id: c.id,
            name: c.name,
            ticketsCount: clientTickets.length,
            volume: volume,
            acceptanceRatio: acceptanceRatio
        };
    });

    const topClientsByCount = [...clientStats].sort((a, b) => b.ticketsCount - a.ticketsCount).slice(0, 10);
    const topClientsByVolume = [...clientStats].sort((a, b) => b.volume - a.volume).slice(0, 10);
    const topClientsByRatio = [...clientStats].sort((a, b) => b.acceptanceRatio - a.acceptanceRatio).slice(0, 10);

    return {
        year,
        current: {
            ticketsCount: currentYearMetrics.tickets.length,
            deliveredCount: currentYearMetrics.delivered.length,
            avgHours: currentYearMetrics.avgHours,
            proposalsRequested: currentYearMetrics.proposalsRequested.length,
            proposalsSent: currentYearMetrics.proposalsSent.length,
            proposalsApproved: currentYearMetrics.proposalsApproved.length,
            acceptanceRatio: currentYearMetrics.proposalsSent.length > 0 ? (currentYearMetrics.proposalsApproved.length / currentYearMetrics.proposalsSent.length) * 100 : 0,
            sentVsRequestedRatio: currentYearMetrics.proposalsRequested.length > 0 ? (currentYearMetrics.proposalsSent.length / currentYearMetrics.proposalsRequested.length) * 100 : 0,
            acceptanceVsRequestedRatio: currentYearMetrics.proposalsRequested.length > 0 ? (currentYearMetrics.proposalsApproved.length / currentYearMetrics.proposalsRequested.length) * 100 : 0,
        },
        previous: {
            ticketsCount: prevYearMetrics.tickets.length,
            deliveredCount: prevYearMetrics.delivered.length,
            avgHours: prevYearMetrics.avgHours,
            proposalsRequested: prevYearMetrics.proposalsRequested.length,
            proposalsSent: prevYearMetrics.proposalsSent.length,
            proposalsApproved: prevYearMetrics.proposalsApproved.length,
        },
        monthly: monthlyData,
        topClientsCount: topClientsByCount,
        topClientsVolume: topClientsByVolume,
        topClientsRatio: topClientsByRatio,
        clients // for the filter dropdown
    };
}
