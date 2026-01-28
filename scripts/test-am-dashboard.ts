// scripts/test-am-dashboard.ts
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE imports that use process.env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testDashboard() {
    console.log('=== AM DASHBOARD DIAGNOSTIC ===\n');

    const year = 2025;
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    try {
        // 1. Check Evolutivos Creados
        const evolutivos = await prisma.ticket.findMany({
            where: {
                issueType: 'Evolutivo',
                createdDate: { gte: startDate, lte: endDate }
            },
            select: { id: true, issueKey: true, createdDate: true }
        });
        console.log(`✓ Evolutivos Creados (2025): ${evolutivos.length}`);
        if (evolutivos.length > 0) {
            console.log(`  Sample: ${evolutivos[0].issueKey} - ${evolutivos[0].createdDate}`);
        }

        // 2. Check Entregas en PRO
        const proTransitions = await prisma.ticketStatusHistory.findMany({
            where: {
                type: 'TICKET',
                status: { in: ['Entregado en PRD', 'ENTREGADO EN PRO', 'Entregado en PRO'], mode: 'insensitive' },
                transitionDate: { gte: startDate, lte: endDate }
            },
            select: { issueKey: true, status: true, transitionDate: true }
        });
        console.log(`\n✓ Transiciones a PRO (2025): ${proTransitions.length}`);
        if (proTransitions.length > 0) {
            console.log(`  Sample: ${proTransitions[0].issueKey} - ${proTransitions[0].status} - ${proTransitions[0].transitionDate}`);
        }

        // 3. Check Ofertas Solicitadas
        const peticiones = await prisma.ticket.findMany({
            where: {
                issueType: 'Petición de Evolutivo',
                createdDate: { gte: startDate, lte: endDate }
            },
            select: { id: true, issueKey: true, createdDate: true }
        });
        console.log(`\n✓ Peticiones de Evolutivo (2025): ${peticiones.length}`);
        if (peticiones.length > 0) {
            console.log(`  Sample: ${peticiones[0].issueKey} - ${peticiones[0].createdDate}`);
        }

        // 4. Check Ofertas Enviadas
        const sentTransitions = await prisma.ticketStatusHistory.findMany({
            where: {
                status: {
                    in: [
                        'Oferta enviada al cliente', 'Oferta enviada al gerente',
                        'Enviado a Cliente', 'Enviado a Gerente',
                        'Oferta Enviada', 'Enviado a SAP',
                        'En revisión', 'Pendiente aprobación', 'Oferta Generada'
                    ],
                    mode: 'insensitive'
                },
                transitionDate: { gte: startDate, lte: endDate }
            },
            select: { issueKey: true, status: true, transitionDate: true }
        });
        console.log(`\n✓ Transiciones "Oferta Enviada" (2025): ${sentTransitions.length}`);
        if (sentTransitions.length > 0) {
            console.log(`  Sample: ${sentTransitions[0].issueKey} - ${sentTransitions[0].status} - ${sentTransitions[0].transitionDate}`);
        }

        // 5. Check Ofertas Aprobadas
        const approvedProposals = await prisma.evolutivoProposal.findMany({
            where: {
                status: { equals: 'Cerrado', mode: 'insensitive' },
                resolution: { equals: 'Aprobada', mode: 'insensitive' },
                NOT: {
                    OR: [
                        { relatedTickets: { equals: '[]' } },
                        { relatedTickets: { equals: '' } }
                    ]
                },
                approvedDate: { gte: startDate, lte: endDate }
            },
            select: { id: true, issueKey: true, approvedDate: true, status: true, resolution: true, relatedTickets: true }
        });
        console.log(`\n✓ Propuestas Aprobadas (2025): ${approvedProposals.length}`);
        if (approvedProposals.length > 0) {
            console.log(`  Sample: ${approvedProposals[0].issueKey} - ${approvedProposals[0].approvedDate}`);
            console.log(`  Related Tickets: ${approvedProposals[0].relatedTickets}`);
        }

        // 6. Check ALL EvolutivoProposals (to see what we have)
        const allProposals = await prisma.evolutivoProposal.findMany({
            select: {
                id: true,
                issueKey: true,
                status: true,
                resolution: true,
                approvedDate: true,
                createdDate: true,
                relatedTickets: true
            },
            take: 10
        });
        console.log(`\n✓ Total Propuestas en DB: ${allProposals.length > 0 ? 'Found' : 'NONE'}`);
        if (allProposals.length > 0) {
            console.log(`  Sample Proposal:`);
            console.log(`    Key: ${allProposals[0].issueKey}`);
            console.log(`    Status: ${allProposals[0].status}`);
            console.log(`    Resolution: ${allProposals[0].resolution}`);
            console.log(`    Approved Date: ${allProposals[0].approvedDate}`);
            console.log(`    Created Date: ${allProposals[0].createdDate}`);
            console.log(`    Related Tickets: ${allProposals[0].relatedTickets}`);
        }

        // 7. Summary
        console.log(`\n=== SUMMARY ===`);
        console.log(`Evolutivos Creados: ${evolutivos.length}`);
        console.log(`Entregas PRO: ${proTransitions.length}`);
        console.log(`Peticiones: ${peticiones.length}`);
        console.log(`Ofertas Enviadas: ${sentTransitions.length}`);
        console.log(`Ofertas Aprobadas: ${approvedProposals.length}`);
        console.log(`\nRatio Aceptación: ${sentTransitions.length > 0 ? ((approvedProposals.length / sentTransitions.length) * 100).toFixed(1) : 0}%`);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDashboard();
