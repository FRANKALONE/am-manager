const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Post-migration script to set default economic values for existing ValidityPeriods
 * Since we lost the data during schema migration, we'll set reasonable defaults
 */

async function setDefaultEconomicValues() {
    console.log('\n=== Setting Default Economic Values for ValidityPeriods ===\n');

    try {
        // Get all ValidityPeriods
        const periods = await prisma.validityPeriod.findMany({
            include: {
                workPackage: true
            }
        });

        console.log(`Found ${periods.length} validity periods to update\n`);

        for (const period of periods) {
            // Set reasonable defaults
            const defaults = {
                totalQuantity: 600,  // Default hours
                rate: 50,            // Default rate
                isPremium: false,
                premiumPrice: null,
                correctionFactor: 1.0
            };

            await prisma.validityPeriod.update({
                where: { id: period.id },
                data: defaults
            });

            console.log(`✅ Updated period ${period.id} for WP ${period.workPackage.name}`);
            console.log(`   ${new Date(period.startDate).toISOString().split('T')[0]} to ${new Date(period.endDate).toISOString().split('T')[0]}`);
            console.log(`   Set: ${defaults.totalQuantity}h @ ${defaults.rate}€/h`);
        }

        console.log(`\n✅ All validity periods updated with default values`);
        console.log(`\n⚠️  IMPORTANT: Please review and update these values in the admin panel!`);

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

setDefaultEconomicValues()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
