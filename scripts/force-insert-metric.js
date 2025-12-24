const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const wpId = "CSE00081MANT0001.1.1";
    console.log(`Forcing Metric for WP: ${wpId} (Dec 2025)`);

    // 1. Check WP exists
    const wp = await prisma.workPackage.findUnique({ where: { id: wpId } });
    if (!wp) {
        console.error("WP Not Found!");
        return;
    }

    // 2. Upsert Metric for Dec 2025
    const month = 12;
    const year = 2025;
    const fakeHours = 123.45; // Distinctive number

    await prisma.monthlyMetric.upsert({
        where: {
            workPackageId_month_year: {
                workPackageId: wpId,
                month,
                year
            }
        },
        update: { consumedHours: fakeHours },
        create: {
            workPackageId: wpId,
            month,
            year,
            consumedHours: fakeHours
        }
    });

    console.log(`SUCCESS: Wrote ${fakeHours} hours to Dec 2025.`);

    // 3. Update WP Total just in case
    await prisma.workPackage.update({
        where: { id: wpId },
        data: { accumulatedHours: 500.00 } // Distinctive Total
    });
    console.log(`SUCCESS: Updated Total to 500.00`);
}

run();
