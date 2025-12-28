const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTicket() {
    const t = await prisma.ticket.findFirst({
        where: { issueKey: 'FAI-411' }
    });
    console.log(JSON.stringify(t, null, 2));
    await prisma.$disconnect();
}

checkTicket();
