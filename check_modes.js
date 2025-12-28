const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const modes = await prisma.worklogDetail.findMany({
        select: { billingMode: true },
        distinct: ['billingMode']
    });
    console.log('Distinct Billing Modes in WorklogDetail:', JSON.stringify(modes, null, 2));

    const ticketModes = await prisma.ticket.findMany({
        select: { billingMode: true },
        distinct: ['billingMode']
    });
    console.log('Distinct Billing Modes in Ticket:', JSON.stringify(ticketModes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
