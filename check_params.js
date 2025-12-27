
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParams() {
    const params = await prisma.parameter.findMany({
        where: { category: 'VALID_TICKET_TYPE' }
    });
    console.log('Valid Ticket Types:', params.map(p => p.value));
}

checkParams().catch(console.error).finally(() => prisma.$disconnect());
