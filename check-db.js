const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const clients = await prisma.client.count();
        const wps = await prisma.workPackage.count();
        const tickets = await prisma.ticket.count();
        const validity = await prisma.validityPeriod.count();
        const users = await prisma.user.count();
        const history = await prisma.ticketStatusHistory.count();

        console.log('--- DB SUMMARY ---');
        console.log(`Clients: ${clients}`);
        console.log(`WorkPackages: ${wps}`);
        console.log(`Tickets: ${tickets}`);
        console.log(`ValidityPeriods: ${validity}`);
        console.log(`Users: ${users}`);
        console.log(`TicketStatusHistory: ${history}`);
        console.log('------------------');
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
