const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearTickets() {
    console.log('Clearing all tickets from database...');

    const result = await prisma.ticket.deleteMany({});

    console.log(`✅ Deleted ${result.count} tickets`);
    console.log('Ready to update schema and resync');

    await prisma.$disconnect();
}

clearTickets().catch(console.error);
