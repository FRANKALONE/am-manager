
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAzzam() {
    const wps = await prisma.workPackage.findMany({
        where: { name: { contains: 'AZZAM' } }
    });
    console.log('Found WPs:', wps.map(w => ({ id: w.id, name: w.name })));

    if (wps.length > 0) {
        for (const wp of wps) {
            const wpId = wp.id;
            const FebLogs = await prisma.worklogDetail.count({
                where: {
                    workPackageId: wpId,
                    year: 2024,
                    month: 2
                }
            });
            console.log(`Worklogs for February 2024 in ${wpId} (${wp.name}): ${FebLogs}`);

            const periods = await prisma.validityPeriod.findMany({
                where: { workPackageId: wpId },
                orderBy: { startDate: 'asc' }
            });
            console.log(`Validity periods for ${wpId}:`, periods);

            const metrics = await prisma.monthlyMetric.findMany({
                where: { workPackageId: wpId, year: { in: [2024, 2025] } },
                orderBy: [{ year: 'asc' }, { month: 'asc' }]
            });
            console.log(`Metrics for ${wpId}:`, metrics);

            const counts = await prisma.worklogDetail.count({
                where: { workPackageId: wpId, year: 2025, month: 2 }
            });
            console.log(`Worklogs for Feb 2025 in ${wpId}: ${counts}`);
        }
    }
}

checkAzzam().catch(console.error).finally(() => prisma.$disconnect());
