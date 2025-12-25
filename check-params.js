const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const params = await prisma.parameter.findMany({
        where: { category: 'VALID_TICKET_TYPE' }
    });
    console.log('Valid Ticket Types:', JSON.stringify(params, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
