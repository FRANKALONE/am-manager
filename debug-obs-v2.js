const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugObs() {
    const wpId = 'AMA00263MANT0001.1.1';
    console.log(`=== Debugging WP: ${wpId} ===`);

    // 1. Get all monthly metrics
    const metrics = await prisma.monthlyMetric.findMany({
        where: { workPackageId: wpId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    console.log('\n--- Monthly Metrics ---');
    for (const m of metrics) {
        // Get detailed sum for this month
        const detailSum = await prisma.worklogDetail.aggregate({
            _sum: { timeSpentHours: true },
            where: { workPackageId: wpId, year: m.year, month: m.month }
        });

        const diff = m.consumedHours - (detailSum._sum.timeSpentHours || 0);
        console.log(`${m.year}-${String(m.month).padStart(2, '0')}: Metric=${m.consumedHours.toFixed(2)}h, DetailSum=${(detailSum._sum.timeSpentHours || 0).toFixed(2)}h, Diff=${diff.toFixed(2)}h`);

        if (Math.abs(diff) > 0.01) {
            // Find what's missing in details if metric is higher
            const authors = await prisma.worklogDetail.groupBy({
                by: ['author'],
                where: { workPackageId: wpId, year: m.year, month: m.month },
                _sum: { timeSpentHours: true }
            });
            console.log(`   Detailed Breakdown:`, authors);
        }
    }

    // 2. Check for Manual Consumptions in Regularizations
    const manualRegs = await prisma.regularization.findMany({
        where: { workPackageId: wpId, type: 'MANUAL_CONSUMPTION' }
    });
    console.log('\n--- Manual Regularizations (MANUAL_CONSUMPTION) ---');
    manualRegs.forEach(r => {
        console.log(`ID: ${r.id}, Date: ${r.date.toISOString().split('T')[0]}, Qty: ${r.quantity}h, Ticket: ${r.ticketId}, Desc: ${r.description}`);
    });

    // 3. Check for potential duplicated metrics (same month/year)
    const allMetrics = await prisma.monthlyMetric.findMany({
        where: { workPackageId: wpId }
    });
    const seen = new Set();
    const duplicates = [];
    allMetrics.forEach(m => {
        const key = `${m.year}-${m.month}`;
        if (seen.has(key)) duplicates.push(key);
        seen.add(key);
    });
    if (duplicates.length > 0) {
        console.log('\n--- DUPLICATED METRIC ENTRIES FOUND ---');
        console.log(duplicates);
    } else {
        console.log('\nNo duplicated metric entries (year/month) found.');
    }
}

debugObs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
