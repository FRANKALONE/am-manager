// scripts/test-proposals.ts
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testProposals() {
    console.log('=== EVOLUTIVO PROPOSALS DIAGNOSTIC ===\n');

    const year = 2025;
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    try {
        // 1. Total proposals
        const totalProposals = await prisma.evolutivoProposal.count();
        console.log(`Total Proposals in DB: ${totalProposals}\n`);

        // 2. Proposals by status
        const byStatus = await prisma.evolutivoProposal.groupBy({
            by: ['status'],
            _count: true
        });
        console.log('Proposals by Status:');
        byStatus.forEach(s => console.log(`  ${s.status || 'NULL'}: ${s._count}`));

        // 3. Proposals by resolution
        const byResolution = await prisma.evolutivoProposal.groupBy({
            by: ['resolution'],
            _count: true
        });
        console.log('\nProposals by Resolution:');
        byResolution.forEach(r => console.log(`  ${r.resolution || 'NULL'}: ${r._count}`));

        // 4. Check current query criteria
        console.log('\n=== CHECKING CURRENT CRITERIA ===');

        const cerrado = await prisma.evolutivoProposal.count({
            where: { status: { equals: 'Cerrado', mode: 'insensitive' } }
        });
        console.log(`Status = 'Cerrado' (case insensitive): ${cerrado}`);

        const aprobada = await prisma.evolutivoProposal.count({
            where: { resolution: { equals: 'Aprobada', mode: 'insensitive' } }
        });
        console.log(`Resolution = 'Aprobada' (case insensitive): ${aprobada}`);

        const withRelated = await prisma.evolutivoProposal.count({
            where: {
                NOT: {
                    OR: [
                        { relatedTickets: { equals: '[]' } },
                        { relatedTickets: { equals: '' } },
                        { relatedTickets: null }
                    ]
                }
            }
        });
        console.log(`Has relatedTickets (not empty): ${withRelated}`);

        const withApprovedDate = await prisma.evolutivoProposal.count({
            where: { approvedDate: { gte: startDate, lte: endDate } }
        });
        console.log(`Has approvedDate in 2025: ${withApprovedDate}`);

        // 5. Combined criteria
        const approved = await prisma.evolutivoProposal.findMany({
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
            select: { issueKey: true, status: true, resolution: true, approvedDate: true, relatedTickets: true }
        });
        console.log(`\n✓ Matching ALL criteria (2025): ${approved.length}`);

        // 6. Sample proposals to see what we have
        console.log('\n=== SAMPLE PROPOSALS ===');
        const samples = await prisma.evolutivoProposal.findMany({
            take: 5,
            orderBy: { createdDate: 'desc' },
            select: {
                issueKey: true,
                status: true,
                resolution: true,
                approvedDate: true,
                createdDate: true,
                relatedTickets: true
            }
        });

        samples.forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.issueKey}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Resolution: ${p.resolution}`);
            console.log(`   Approved Date: ${p.approvedDate}`);
            console.log(`   Created Date: ${p.createdDate}`);
            console.log(`   Related Tickets: ${p.relatedTickets}`);
        });

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testProposals();
