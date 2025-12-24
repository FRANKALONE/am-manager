const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Migration script to move economic fields from WorkPackage to ValidityPeriod
 * 
 * For each WorkPackage:
 * 1. Get current economic values (totalQuantity, rate, isPremium, premiumPrice, correctionFactor)
 * 2. Update all ValidityPeriods with these values
 * 3. If WP has no ValidityPeriods, create one for current year with these values
 */

async function migrateEconomicFields() {
    console.log('\n=== Starting Migration: Economic Fields to ValidityPeriod ===\n');

    try {
        // Get all WorkPackages with their validity periods
        const workPackages = await prisma.workPackage.findMany({
            include: {
                validityPeriods: true
            }
        });

        console.log(`Found ${workPackages.length} Work Packages to migrate\n`);

        for (const wp of workPackages) {
            console.log(`\n📦 Migrating WP: ${wp.id} - ${wp.name}`);
            console.log(`   Economic values:`);
            console.log(`   - Total Quantity: ${wp.totalQuantity}`);
            console.log(`   - Rate: ${wp.rate}`);
            console.log(`   - Premium: ${wp.isPremium}`);
            console.log(`   - Premium Price: ${wp.premiumPrice || 'N/A'}`);
            console.log(`   - Correction Factor: ${wp.correctionFactor}`);

            if (wp.validityPeriods.length === 0) {
                // No validity periods - create one for current year
                const currentYear = new Date().getFullYear();
                const startDate = new Date(`${currentYear}-01-01`);
                const endDate = new Date(`${currentYear}-12-31`);

                console.log(`   ⚠️  No validity periods found. Creating default period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

                await prisma.validityPeriod.create({
                    data: {
                        workPackageId: wp.id,
                        startDate,
                        endDate,
                        totalQuantity: wp.totalQuantity,
                        rate: wp.rate,
                        isPremium: wp.isPremium,
                        premiumPrice: wp.premiumPrice,
                        correctionFactor: wp.correctionFactor
                    }
                });

                console.log(`   ✅ Created validity period with economic values`);
            } else {
                // Update all existing validity periods with WP's economic values
                console.log(`   Found ${wp.validityPeriods.length} validity period(s)`);

                for (const period of wp.validityPeriods) {
                    await prisma.validityPeriod.update({
                        where: { id: period.id },
                        data: {
                            totalQuantity: wp.totalQuantity,
                            rate: wp.rate,
                            isPremium: wp.isPremium,
                            premiumPrice: wp.premiumPrice,
                            correctionFactor: wp.correctionFactor
                        }
                    });

                    console.log(`   ✅ Updated period ${period.id} (${new Date(period.startDate).toISOString().split('T')[0]} to ${new Date(period.endDate).toISOString().split('T')[0]})`);
                }
            }
        }

        console.log(`\n\n✅ Migration completed successfully!`);
        console.log(`   Migrated ${workPackages.length} Work Packages`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateEconomicFields()
    .then(() => {
        console.log('\n✅ All done! You can now apply the Prisma schema changes.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    });
