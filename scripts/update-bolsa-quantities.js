const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        where: {
            contractType: 'BOLSA',
            billingType: 'MENSUAL'
            // And has validity period?
        },
        include: {
            validityPeriods: true
        }
    });

    console.log(`Found ${wps.length} Bolsa/Mensual WPs.`);

    for (const wp of wps) {
        if (wp.validityPeriods.length === 0) {
            console.warn(`[SKIP] ${wp.name} (${wp.id}) has no validity period.`);
            continue;
        }

        const period = wp.validityPeriods[0]; // Assume first active period roughly
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        // Calculate months inclusive
        // (YearDiff * 12) + (MonthEnd - MonthStart) + 1
        // Example: Jan to Dec = 0 * 12 + (11 - 0) + 1 = 12.
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

        if (months <= 0) {
            console.warn(`[SKIP] ${wp.name} calculated months <= 0: ${months}`);
            continue;
        }

        const currentQty = wp.totalQuantity;
        const newQty = currentQty * months;

        console.log(`[UPDATE] ${wp.id} "${wp.name}"`);
        console.log(`    Period: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]} (${months} months)`);
        console.log(`    Quantity: ${currentQty} (Monthly) -> ${newQty} (Total)`);

        await prisma.workPackage.update({
            where: { id: wp.id },
            data: { totalQuantity: newQty } // Update only totalQuantity
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
