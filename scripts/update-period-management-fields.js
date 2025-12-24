const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update existing ValidityPeriods with default values for new fields:
 * - scopeUnit
 * - regularizationType  
 * - surplusStrategy
 */

async function updatePeriodFields() {
    console.log('\n=== Updating ValidityPeriods with Management Fields ===\n');

    try {
        const periods = await prisma.validityPeriod.findMany({
            include: {
                workPackage: true
            }
        });

        console.log(`Found ${periods.length} validity periods to update\n`);

        for (const period of periods) {
            await prisma.validityPeriod.update({
                where: { id: period.id },
                data: {
                    scopeUnit: "HORAS",
                    regularizationType: null,
                    surplusStrategy: null
                }
            });

            console.log(`✅ Updated period ${period.id} for WP ${period.workPackage.name}`);
            console.log(`   Set: scopeUnit=HORAS, regularizationType=null, surplusStrategy=null`);
        }

        console.log(`\n✅ All validity periods updated`);

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updatePeriodFields()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
