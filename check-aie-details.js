const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIEWPDetails() {
    try {
        const wp = await prisma.workPackage.findUnique({
            where: { id: 'AMA00253MANT0001.1.1' },
            include: {
                validityPeriods: true,
                monthlyMetrics: true
            }
        });

        console.log('\n📦 WP Details:\n');
        console.log('ID:', wp.id);
        console.log('Name:', wp.name);
        console.log('Tempo Account ID:', wp.tempoAccountId);
        console.log('Old WP ID:', wp.oldWpId);
        console.log('Contract Type:', wp.contractType);
        console.log('\n📅 Validity Periods:', wp.validityPeriods.length);
        wp.validityPeriods.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.startDate} to ${p.endDate}`);
        });

        console.log('\n📊 Monthly Metrics:', wp.monthlyMetrics.length);
        wp.monthlyMetrics.forEach((m) => {
            console.log(`  ${m.year}-${String(m.month).padStart(2, '0')}: ${m.consumedHours}h`);
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAIEWPDetails();
