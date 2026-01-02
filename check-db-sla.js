const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const tickets = await prisma.ticket.findMany({
        where: { issueKey: { in: ['AIE-438', 'AIE-442'] } }
    });
    console.log(JSON.stringify(tickets, null, 2));
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
