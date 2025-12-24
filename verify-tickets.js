const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTickets() {
    console.log('=== Verifying Tickets with New Fields ===\n');

    const tickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { createdDate: 'desc' }
    });

    console.log(`Total tickets in DB: ${await prisma.ticket.count()}`);
    console.log('\nSample tickets:');

    tickets.forEach(t => {
        console.log(`\n${t.issueKey} - ${t.issueType}`);
        console.log(`  Summary: ${t.issueSummary.substring(0, 50)}...`);
        console.log(`  Created: ${t.createdDate.toISOString().split('T')[0]}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Reporter: ${t.reporter}`);
    });

    await prisma.$disconnect();
}

verifyTickets().catch(console.error);
