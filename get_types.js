const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const params = await prisma.parameter.findMany({
        where: { category: 'VALID_TICKET_TYPE' }
    });
    console.log(JSON.stringify(params.map(p => p.value)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
