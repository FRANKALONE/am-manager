const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonthlyMetrics() {
    try {
        // Find the WP
        const wp = await prisma.workPackage.findFirst({
            where: {
                tempoAccountId: 1129
            },
            include: {
                monthlyMetrics: {
                    orderBy: [{ year: 'asc' }, { month: 'asc' }]
                },
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                }
            }
        });

        if (!wp) {
            console.log('❌ WP not found');
            return;
        }

        console.log(`\n=== Work Package: ${wp.name} ===`);
        console.log(`Tempo Account ID: ${wp.tempoAccountId}`);
        console.log(`Total Quantity: ${wp.totalQuantity}h`);
        console.log(`Accumulated Hours: ${wp.accumulatedHours}h`);

        console.log(`\n=== Validity Periods ===`);
        wp.validityPeriods.forEach(period => {
            console.log(`  ${period.startDate} to ${period.endDate}`);
        });

        console.log(`\n=== Monthly Metrics (Consumed Hours by Month) ===`);
        if (wp.monthlyMetrics.length === 0) {
            console.log('  No monthly metrics found. Run sync first.');
        } else {
            wp.monthlyMetrics.forEach(metric => {
                const monthLabel = `${metric.month.toString().padStart(2, '0')}/${metric.year}`;
                console.log(`  ${monthLabel}: ${metric.consumedHours.toFixed(2)}h`);
            });

            const total = wp.monthlyMetrics.reduce((sum, m) => sum + m.consumedHours, 0);
            console.log(`\n  TOTAL: ${total.toFixed(2)}h`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMonthlyMetrics();
