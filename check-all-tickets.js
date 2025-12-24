const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTickets() {
    const tickets = await prisma.ticket.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    console.log(`Total tickets in database: ${tickets.length}\n`);

    if (tickets.length > 0) {
        console.log('Recent tickets:');
        tickets.slice(0, 10).forEach(t => {
            console.log(`  - ${t.issueKey}: ${t.issueType} (${t.year}-${String(t.month).padStart(2, '0')})`);
        });
    } else {
        console.log('⚠️  No tickets found in database');
    }

    await prisma.$disconnect();
}

checkAllTickets().catch(console.error);
