// scripts/check-ticket-data.ts
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function check() {
    console.log('=== CHECKING TICKET DATA FOR METRICS ===\n');

    try {
        const sampleTickets = await prisma.ticket.findMany({
            take: 100,
            where: {
                slaResolution: { not: null }
            }
        });

        console.log(`Tickets with slaResolution: ${sampleTickets.length}`);
        if (sampleTickets.length > 0) {
            console.log('Sample SLA Resolution values:');
            sampleTickets.slice(0, 5).forEach(t => console.log(`  - ${t.issueKey}: ${t.slaResolution} (Time: ${t.slaResolutionTime})`));
        }

        const withResponseSLA = await prisma.ticket.count({
            where: { slaResponse: { not: null } }
        });
        console.log(`\nTickets with slaResponse: ${withResponseSLA}`);

        const withComponent = await prisma.ticket.count({
            where: {
                AND: [
                    { component: { not: null } },
                    { component: { not: '' } }
                ]
            }
        });
        console.log(`\nTickets with Component: ${withComponent}`);

        const withResolution = await prisma.ticket.count({
            where: { resolution: { not: null } }
        });
        console.log(`\nTickets with Resolution: ${withResolution}`);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
