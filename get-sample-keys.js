
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { createdDate: 'desc' },
        select: { issueKey: true, component: true }
    });
    console.log(JSON.stringify(tickets, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
