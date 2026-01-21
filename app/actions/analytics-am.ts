"use server";

import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function getAmManagementReport(year: number, clientId?: string) {
    const session = await getAuthSession();
    if (!session) throw new Error("Unauthorized");

    // Projects to exclude
    const excludedClientName = "TRANSCOM";

    // 1. Fetch relevant clients
    const clients = await prisma.client.findMany({
        where: {
            name: { not: excludedClientName },
            id: clientId || undefined
        },
        select: {
            id: true,
            name: true
        }
    });

    const clientIds = clients.map(c => c.id);

    // 2. Fetch Tickets for these clients
    // We filter by JSM project type using service_desk identifier if needed, 
    // but usually, Client -> WP -> Ticket is enough if we trust the project mapping.
    const tickets = await prisma.ticket.findMany({
        where: {
            workPackage: {
                clientId: { in: clientIds }
            },
            createdDate: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
            }
        },
        include: {
            workPackage: {
                select: { clientId: true }
            }
        }
    });

    // 3. Fetch Proposals
    const proposals = await (prisma as any).evolutivoProposal.findMany({
        where: {
            clientId: { in: clientIds },
            createdDate: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
            }
        }
    });

    // 4. Fetch Transitions for the year
    const transitions = await (prisma as any).ticketStatusHistory.findMany({
        where: {
            transitionDate: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`)
            }
        }
    });

    // 5. Fetch Worklogs (Sold Hours)
    // Sold hours are typically logged/billed hours in Evolutivo WPs
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackage: {
                clientId: { in: clientIds },
                contractType: 'EVOLUTIVOS'
            },
            year: year
        }
    });

    return {
        tickets,
        proposals,
        transitions,
        worklogs,
        clients
    };
}
