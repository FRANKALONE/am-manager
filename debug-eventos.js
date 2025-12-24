const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugEventosWP() {
    console.log('=== Debugging Eventos WP ===\n');

    // Find WP with contractType EVENTOS
    const eventosWPs = await prisma.workPackage.findMany({
        where: {
            contractType: {
                contains: 'Eventos'
            }
        },
        include: {
            tickets: {
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
                take: 10
            },
            validityPeriods: true
        }
    });

    console.log(`Found ${eventosWPs.length} Eventos WPs\n`);

    for (const wp of eventosWPs) {
        console.log(`\n--- WP: ${wp.name} ---`);
        console.log(`Contract Type: ${wp.contractType}`);
        console.log(`JIRA Project Keys: ${wp.jiraProjectKeys}`);
        console.log(`Total tickets: ${wp.tickets.length}`);

        if (wp.tickets.length > 0) {
            console.log('\nRecent tickets:');
            wp.tickets.slice(0, 5).forEach(t => {
                console.log(`  - ${t.issueKey}: ${t.issueType}, Created: ${t.createdDate.toISOString().split('T')[0]}`);
            });

            // Count tickets by month
            const ticketsByMonth = {};
            wp.tickets.forEach(t => {
                const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
                if (!ticketsByMonth[key]) ticketsByMonth[key] = 0;
                ticketsByMonth[key]++;
            });

            console.log('\nTickets by month:');
            Object.keys(ticketsByMonth).sort().forEach(month => {
                console.log(`  ${month}: ${ticketsByMonth[month]} tickets`);
            });
        } else {
            console.log('⚠️  No tickets found - sync may not have run yet or failed');
        }

        console.log(`\nValidity Periods: ${wp.validityPeriods.length}`);
        wp.validityPeriods.forEach(p => {
            console.log(`  - ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`);
        });
    }

    await prisma.$disconnect();
}

debugEventosWP().catch(console.error);
