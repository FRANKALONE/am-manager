const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        select: {
            id: true,
            name: true,
            contractType: true,
            billingType: true,
            totalQuantity: true,
            validityPeriods: true
        }
    });

    console.log("Total WPs:", wps.length);
    wps.forEach(wp => {
        console.log(`[${wp.id}] ${wp.name} | Type: ${wp.contractType} | Billing: ${wp.billingType} | Qty: ${wp.totalQuantity}`);
        if (wp.validityPeriods.length > 0) {
            console.log(`   Period: ${wp.validityPeriods[0].startDate.toISOString()} - ${wp.validityPeriods[0].endDate.toISOString()}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
