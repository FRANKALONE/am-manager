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
        const clients = await prisma.client.findMany({
            where: {
                name: { not: excludedClientName },
                id: clientId || undefined
            },
            select: { id: true, name: true }
        });

        if (!clients || clients.length === 0) {
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

        const fetchYearlyMetrics = async (start: Date, end: Date, clientsListIds: string[]) => {
            // Req 1: Evolutivos Creados (issueType='Evolutivo')
            const evolutivos = await prisma.ticket.findMany({
                where: {
                    workPackage: { clientId: { in: clientsListIds } },
                    issueType: 'Evolutivo',
                    createdDate: { gte: start, lte: end }
                },
                select: { id: true, createdDate: true, originalEstimate: true, billingMode: true, workPackage: { select: { clientId: true } } }
            });

            // Req 2: Entregados en PRO (issueType='Evolutivo' AND transition status = "Entregado en PRD/PRO")
            const proTransitions = await prisma.ticketStatusHistory.findMany({
                where: {
                    type: 'TICKET',
                    status: { in: ['Entregado en PRD', 'ENTREGADO EN PRO', 'Entregado en PRO'], mode: 'insensitive' },
                    transitionDate: { gte: start, lte: end }
                }
            });

            // Filter transitions by ticket type and client (Req 2 join)
            const evolutivosEntregadosPro = await prisma.ticket.findMany({
                where: {
                    issueKey: { in: proTransitions.map(t => t.issueKey) },
                    issueType: 'Evolutivo',
                    workPackage: { clientId: { in: clientsListIds } }
                },
                select: { issueKey: true }
            });
            const validProTransitions = proTransitions.filter(tr => evolutivosEntregadosPro.some(t => t.issueKey === tr.issueKey));

            // Req 3: Evolutivo Medio (Facturable/Bolsa de Horas)
            const mediaTickets = evolutivos.filter(t => {
                const bm = t.billingMode?.toLowerCase().trim() || "";
                return bm.includes("facturable") || bm.includes("bolsa de horas");
            });
            const totalEstimacionJornadas = mediaTickets.reduce((sum, t) => sum + (t.originalEstimate || 0), 0) / 8;
            const avgJornadas = mediaTickets.length > 0 ? totalEstimacionJornadas / mediaTickets.length : 0;

            // Req 4: Ofertas Solicitadas (issueType='Petición de Evolutivo')
            const peticionesEvolutivo = await prisma.ticket.findMany({
                where: {
                    workPackage: { clientId: { in: clientsListIds } },
                    issueType: 'Petición de Evolutivo',
                    createdDate: { gte: start, lte: end }
                },
                select: { issueKey: true, createdDate: true, workPackage: { select: { clientId: true } } }
            });

            // Req 5: Ofertas Enviadas (SOLO Petición de Evolutivo -> Status "Oferta enviada...")
            // User clarification: Only count "Petición de Evolutivo" with specific status transitions
            const allSentTransitions = await prisma.ticketStatusHistory.findMany({
                where: {
                    status: {
                        in: [
                            'Oferta Generada',
                            'Oferta enviada al cliente',
                            'Oferta enviada al gerente'
                        ],
                        mode: 'insensitive'
                    },
                    transitionDate: { gte: start, lte: end }
                },
                orderBy: { transitionDate: 'asc' }
            });

            // ONLY fetch "Petición de Evolutivo" tickets (NOT Evolutivos)
            const sentPeticionesFull = await prisma.ticket.findMany({
                where: {
                    issueKey: { in: allSentTransitions.map(t => t.issueKey) },
                    issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
                    workPackage: { clientId: { in: clientsListIds } }
                },
                select: { issueKey: true, issueType: true, workPackage: { select: { clientId: true } } }
            });

            // Deduplicate: Only one transition per unique ticket ID (first occurrence in period)
            const validSentTransitions = [];
            const processedKeys = new Set();

            for (const tr of allSentTransitions) {
                if (processedKeys.has(tr.issueKey)) continue;

                const ticket = sentPeticionesFull.find(p => p.issueKey === tr.issueKey);
                if (!ticket) continue;

                validSentTransitions.push(tr);
                processedKeys.add(tr.issueKey);
            }

            const sentPeticiones = sentPeticionesFull.filter(p => processedKeys.has(p.issueKey));

            // Req 6: Ofertas Aprobadas (Petición de Evolutivo con Status=Cerrado y Resolution=Aprobada)
            // User clarification: Use Ticket table, not EvolutivoProposal
            const approvedPeticiones = await prisma.ticket.findMany({
                where: {
                    workPackage: { clientId: { in: clientsListIds } },
                    issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
                    status: { equals: 'Cerrado', mode: 'insensitive' },
                    resolution: { equals: 'Aprobada', mode: 'insensitive' },
                    // Use createdDate as proxy since we don't have approvedDate on Ticket
                    createdDate: { gte: start, lte: end }
                },
                select: { issueKey: true, createdDate: true, workPackage: { select: { clientId: true } } }
            });

            return {
                creados: evolutivos,
                entregados: validProTransitions,
                avgJornadas: avgJornadas,
                totalJornadas: totalEstimacionJornadas,
                solicitadas: peticionesEvolutivo,
                enviadas: validSentTransitions,
                aprobadas: approvedPeticiones,
                sentPeticiones: sentPeticiones
            };
        };

        const current = await fetchYearlyMetrics(startDate, endDate, clientIds);
        const previous = await fetchYearlyMetrics(prevStartDate, prevEndDate, clientIds);

        // Monthly Breakdown (Current Year)
        const monthly = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            return {
                month: m,
                creados: current.creados.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m).length,
                entregados: current.entregados.filter(t => new Date(t.transitionDate).getUTCMonth() + 1 === m).length,
                requested: current.solicitadas.filter(t => new Date(t.createdDate).getUTCMonth() + 1 === m).length,
                sent: current.enviadas.filter(t => new Date(t.transitionDate).getUTCMonth() + 1 === m).length,
                aprobadas: current.aprobadas.filter(t => t.createdDate && new Date(t.createdDate).getUTCMonth() + 1 === m).length
            };
        });

        // Client Statistics (Top Rankings)
        const clientStats = clients.map(c => {
            const cCreados = current.creados.filter(t => t.workPackage.clientId === c.id);
            const cSolicitadas = current.solicitadas.filter(t => t.workPackage.clientId === c.id).length;
            const cEnviadas = current.enviadas.filter(t => current.sentPeticiones.some((p: any) => p.issueKey === t.issueKey && p.workPackage.clientId === c.id)).length;
            const cAprobadas = current.aprobadas.filter(p => p.workPackage.clientId === c.id).length;
            const volumne = cCreados.reduce((sum, t) => sum + (t.originalEstimate || 0), 0) / 8; // Req 9: Volumen en jornadas

            return {
                id: c.id,
                name: c.name,
                ticketsCount: cCreados.length, // Req 8
                volume: volumne, // Req 9
                acceptanceRatio: cEnviadas > 0 ? (cAprobadas / cEnviadas) * 100 : 0 // Unified Acceptance Ratio
            };
        });

        const topClientsCount = [...clientStats].sort((a, b) => b.ticketsCount - a.ticketsCount).slice(0, 10);
        const topClientsVolume = [...clientStats].sort((a, b) => b.volume - a.volume).slice(0, 10);
        const topClientsRatio = [...clientStats].sort((a, b) => b.acceptanceRatio - a.acceptanceRatio).slice(0, 10);

        return {
            year,
            current: {
                ticketsCount: current.creados.length,
                deliveredCount: current.entregados.length,
                avgHours: current.avgJornadas,
                proposalsRequested: current.solicitadas.length,
                proposalsSent: current.enviadas.length,
                proposalsApproved: current.aprobadas.length,
                acceptanceRatio: current.enviadas.length > 0 ? (current.aprobadas.length / current.enviadas.length) * 100 : 0,
                sentVsRequestedRatio: current.solicitadas.length > 0 ? (current.enviadas.length / current.solicitadas.length) * 100 : 0,
                acceptanceVsRequestedRatio: current.solicitadas.length > 0 ? (current.aprobadas.length / current.solicitadas.length) * 100 : 0,
            },
            previous: {
                ticketsCount: previous.creados.length,
                deliveredCount: previous.entregados.length,
                avgHours: previous.avgJornadas,
                proposalsRequested: previous.solicitadas.length,
                proposalsSent: previous.enviadas.length,
                proposalsApproved: previous.aprobadas.length,
                acceptanceRatio: previous.enviadas.length > 0 ? (previous.aprobadas.length / previous.enviadas.length) * 100 : 0,
                sentVsRequestedRatio: previous.solicitadas.length > 0 ? (previous.enviadas.length / previous.solicitadas.length) * 100 : 0,
            },
            monthly,
            topClientsCount,
            topClientsVolume,
            topClientsRatio,
            clients
        };
    } catch (error) {
        console.error("[getAmManagementReport] Error:", error);
        throw error;
    }
}
