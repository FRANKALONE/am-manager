const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const regs = await prisma.regularization.findMany({
        where: { type: 'MANUAL_CONSUMPTION' },
        orderBy: { date: 'asc' }
    });

    const seen = new Map();
    const duplicates = [];

    for (const reg of regs) {
        const key = `${reg.workPackageId}_${reg.date.toISOString()}_${reg.ticketId}_${reg.quantity}`;
        if (seen.has(key)) {
            duplicates.push(reg);
        } else {
            seen.set(key, reg.id);
        }
    }

    console.log(`Found ${duplicates.length} duplicate manual consumptions out of ${regs.length} total.`);
    if (duplicates.length > 0) {
        console.log('Sample duplicates:', JSON.stringify(duplicates.slice(0, 5), null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
