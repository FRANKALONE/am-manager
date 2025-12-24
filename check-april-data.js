const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAprilData() {
    try {
        // Get Europesnacks WP
        const wp = await prisma.workPackage.findFirst({
            where: {
                client: {
                    name: {
                        contains: 'Europesnacks'
                    }
                }
            }
        });

        if (!wp) {
            console.log('WP not found');
            return;
        }

        console.log(`\n📦 WP: ${wp.id}\n`);

        // Get monthly metric for April 2025
        const metric = await prisma.monthlyMetric.findFirst({
            where: {
                workPackageId: wp.id,
                year: 2025,
                month: 4
            }
        });

        console.log('📊 Monthly Metric (April 2025):');
        console.log(`   Consumed Hours: ${metric?.consumedHours || 'NOT FOUND'}\n`);

        // Get worklog details for April 2025
        const worklogs = await prisma.worklogDetail.findMany({
            where: {
                workPackageId: wp.id,
                year: 2025,
                month: 4
            },
            orderBy: {
                issueType: 'asc'
            }
        });

        console.log(`📋 Worklog Details (April 2025): ${worklogs.length} records\n`);

        // Group by type
        const byType = {};
        worklogs.forEach(w => {
            if (!byType[w.issueType]) {
                byType[w.issueType] = [];
            }
            byType[w.issueType].push(w);
        });

        Object.entries(byType).forEach(([type, logs]) => {
            const total = logs.reduce((sum, l) => sum + l.timeSpentHours, 0);
            console.log(`${type}: ${total.toFixed(2)}h (${logs.length} records)`);
            logs.forEach(l => {
                console.log(`  - ${l.issueKey}: ${l.timeSpentHours.toFixed(2)}h (${l.author})`);
            });
            console.log('');
        });

        const grandTotal = worklogs.reduce((sum, w) => sum + w.timeSpentHours, 0);
        console.log(`\n✅ Grand Total from details: ${grandTotal.toFixed(2)}h`);
        console.log(`📊 Monthly Metric shows: ${metric?.consumedHours.toFixed(2) || 'N/A'}h`);

        if (metric && Math.abs(grandTotal - metric.consumedHours) > 0.01) {
            console.log(`\n⚠️  MISMATCH: ${Math.abs(grandTotal - metric.consumedHours).toFixed(2)}h difference`);
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAprilData();
