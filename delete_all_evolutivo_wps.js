// Script to delete all EVOLUTIVO WPs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteEvolutivoWPs() {
    console.log('=== Deleting all EVOLUTIVO Work Packages ===\n');

    // Find all EVOLUTIVO WPs
    const evolutivoWps = await prisma.workPackage.findMany({
        where: {
            contractType: 'EVOLUTIVO'
        }
    });

    console.log(`Found ${evolutivoWps.length} EVOLUTIVO WPs:\n`);

    evolutivoWps.forEach(wp => {
        console.log(`  ${wp.id}: ${wp.name}`);
    });

    if (evolutivoWps.length === 0) {
        console.log('\nNo EVOLUTIVO WPs to delete');
        await prisma.$disconnect();
        return;
    }

    console.log('\nDeleting...');

    for (const wp of evolutivoWps) {
        try {
            // Delete will cascade to related records (WorklogDetail, MonthlyMetric, etc.)
            await prisma.workPackage.delete({
                where: { id: wp.id }
            });
            console.log(`  ✓ Deleted ${wp.id}`);
        } catch (error) {
            console.log(`  ✗ Error deleting ${wp.id}: ${error.message}`);
        }
    }

    console.log('\nDone!');
    await prisma.$disconnect();
}

deleteEvolutivoWPs().catch(console.error);
