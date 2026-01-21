"use server";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function getAmManagementReport(year: number, clientId?: string) {
    try {
        console.log(`[getAmManagementReport] Starting report for year: ${year}, clientId: ${clientId || 'all'}`);

        const session = await getAuthSession();
        if (!session) throw new Error("Unauthorized");

        const excludedClientName = "TRANSCOM";
        const startDate = new Date(`${year}-01-01T00:00:00Z`);
        const endDate = new Date(`${year}-12-31T23:59:59Z`);

        const prevYear = year - 1;
        const prevStartDate = new Date(`${prevYear}-01-01T00:00:00Z`);
        const prevEndDate = new Date(`${prevYear}-12-31T23:59:59Z`);

        // 1. Fetch relevant clients (Exclude TRANSCOM)
        console.log(`[getAmManagementReport] Fetching clients...`);
        const clients = await prisma.client.findMany({
            where: {
                name: { not: excludedClientName },
                id: clientId || undefined
            },
            select: { id: true, name: true }
        });

        if (!clients || clients.length === 0) {
            console.log(`[getAmManagementReport] No clients found matching criteria.`);
            return {
                year,
                current: { ticketsCount: 0, deliveredCount: 0, avgHours: 0, proposalsRequested: 0, proposalsSent: 0, proposalsApproved: 0, acceptanceRatio: 0, sentVsRequestedRatio: 0, acceptanceVsRequestedRatio: 0 },
                previous: { ticketsCount: 0, deliveredCount: 0, avgHours: 0, proposalsRequested: 0, proposalsSent: 0, proposalsApproved: 0 },
                monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, creados: 0, entregados: 0, requested: 0, sent: 0 })),
                topClientsCount: [],
                topClientsVolume: [],
                topClientsRatio: [],
                clients: []
            };
        }

        const clientIds = clients.map(c => c.id);
        console.log(`[getAmManagementReport] Found ${clients.length} clients.`);

        // HELPER: Fetch metrics for a specific time range
        const fetchYearlyMetrics = async (start: Date, end: Date, clientsListIds: string[]) => {
            console.log(`[getAmManagementReport] Fetching yearly metrics for period ${start.toISOString()} to ${end.toISOString()}...`);

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

            // Metric 2: Entregados en PRO (Historical status check for ALL tickets)
            const proTransitions = await (prisma as any).ticketStatusHistory.findMany({
                where: {
                    type: 'TICKET',
                    status: {
                        in: ['ENTREGADO EN PRO', 'Entregado en PRD', 'Entregado en PRO'],
                        mode: 'insensitive'
                    },
                    transitionDate: { gte: start, lte: end }
                }
            });

            // Map transitions back to ticket types and filter by client
            const proIssueKeys = proTransitions.map((tr: any) => tr.issueKey);
            const proTickets = await prisma.ticket.findMany({
                where: {
                    issueKey: { in: proIssueKeys },
                    issueType: 'Evolutivo',
                    workPackage: { clientId: { in: clientsListIds } }
                }
            });

            // Map transitions back to found tickets to keep the transition date for monthly breakdown correctly
            const evolutivosEntregadosPro = proTransitions.filter((tr: any) =>
                proTickets.some(t => t.issueKey === tr.issueKey)
            );

            // Metric 3: Evolutivo Medio (Hours)
            const facturableEvolutivos = evolutivosCreados.filter(t =>
                t.workPackage &&
                (t.workPackage.billingType === 'FACTURABLE' || t.workPackage.billingType === 'BOLSA') &&
                t.workPackage.contractType === 'EVOLUTIVOS'
            );
            const totalEstimatedHours = facturableEvolutivos.reduce((sum, t) => sum + (t.originalEstimate || 0), 0);
            // 1 journal = 8 hours
            const avgEstimatedHours = facturableEvolutivos.length > 0 ? (totalEstimatedHours / facturableEvolutivos.length) / 8 : 0;
            const totalEstimatedJournals = totalEstimatedHours / 8;

            // PROPOSALS (Metric 4, 5, 6, 7, 9, 10)
            const proposals = await (prisma as any).evolutivoProposal.findMany({
                where: {
                    clientId: { in: clientsListIds },
                    createdDate: { gte: start, lte: end }
                }
            });

            // Metric 5: Ofertas Enviadas (Using transitions to be more reliable)
            const sentTransitions = await (prisma as any).ticketStatusHistory.findMany({
                where: {
                    type: 'PROPOSAL',
                    status: {
                        in: [
                            'Enviado a Gerente',
                            'Enviado a Cliente',
                            'Oferta enviada al cliente',
                            'Oferta enviada al gerente',
                            'Oferta Enviada'
                        ],
                        mode: 'insensitive'
                    },
                    transitionDate: { gte: start, lte: end }
                }
            });
            const sentProposalKeys = sentTransitions.map((tr: any) => tr.issueKey);
            const sentProposals = await (prisma as any).evolutivoProposal.findMany({
                where: {
                    issueKey: { in: sentProposalKeys },
                    clientId: { in: clientsListIds }
                }
            });
            // Match transitions back to filter by client
            const filteredSentTransitions = sentTransitions.filter((tr: any) =>
                sentProposals.some((p: any) => p.issueKey === tr.issueKey)
            );

            // Metric 6: Ofertas Aprobadas (Transitions to CERRADO + resolution study)
            const closedTransitions = await (prisma as any).ticketStatusHistory.findMany({
                where: {
                    type: 'PROPOSAL',
                    status: {
                        in: ['Cerrado', 'CERRADO'],
                        mode: 'insensitive'
                    },
                    transitionDate: { gte: start, lte: end }
                }
            });
            const closedProposalKeys = closedTransitions.map((tr: any) => tr.issueKey);
            const approvedProposals = await (prisma as any).evolutivoProposal.findMany({
                where: {
                    issueKey: { in: closedProposalKeys },
                    clientId: { in: clientsListIds },
                    resolution: 'Aprobada'
                }
            });
            // Match transitions back
            const filteredApprovedTransitions = closedTransitions.filter((tr: any) =>
                approvedProposals.some((p: any) => p.issueKey === tr.issueKey)
            );

            return {
                tickets: evolutivosCreados,
                delivered: evolutivosEntregadosPro,
                avgHours: avgEstimatedHours,
                totalHours: totalEstimatedJournals,
                proposalsRequested: proposals,
                proposalsSent: filteredSentTransitions,
                proposalsApproved: approvedProposals,
                rawTickets: tickets
            };
        }

        console.log(`[getAmManagementReport] Fetching current year metrics...`);
        const currentYearMetrics = await fetchYearlyMetrics(startDate, endDate, clientIds);

        console.log(`[getAmManagementReport] Fetching previous year metrics...`);
        const prevYearMetrics = await fetchYearlyMetrics(prevStartDate, prevEndDate, clientIds);

        // Monthly breakdown for Current Year
        console.log(`[getAmManagementReport] Calculating monthly breakdown...`);
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            return {
                month,
                creados: currentYearMetrics.tickets.filter(t => t.createdDate && new Date(t.createdDate).getUTCMonth() + 1 === month).length,
                entregados: currentYearMetrics.delivered.filter((d: any) => d.transitionDate && new Date(d.transitionDate).getUTCMonth() + 1 === month).length,
                requested: currentYearMetrics.proposalsRequested.filter((p: any) => p.createdDate && new Date(p.createdDate).getUTCMonth() + 1 === month).length,
                sent: currentYearMetrics.proposalsSent.filter((p: any) => {
                    const date = p.sentToClientDate || p.sentToGerenteDate;
                    return date && new Date(date).getUTCMonth() + 1 === month;
                }).length
            };
        });

        // Top 10 Clients by Num Evolutivos (Metric 8)
        console.log(`[getAmManagementReport] Calculating client statistics...`);
        const clientStats = clients.map(c => {
            const clientTickets = currentYearMetrics.tickets.filter(t => t.workPackage && t.workPackage.clientId === c.id);
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

        console.log(`[getAmManagementReport] Report completed successfully.`);
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
    } catch (error: any) {
        console.error(`[getAmManagementReport] FATAL ERROR:`, error);
        throw error;
    }
}
