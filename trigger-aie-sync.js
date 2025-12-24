const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function triggerAIESync() {
    try {
        // Import sync function
        const { syncWorkPackage } = await import('./app/actions/sync.ts');

        console.log('Triggering sync for AIE WP with corrected Account ID...\n');

        const result = await syncWorkPackage('AMA00253MANT0001.1.1');

        console.log('\nSync result:', result);
        console.log('\nCheck sync-debug.log for detailed logs');

        // Now check if AIE-290 appears
        const worklogs = await prisma.worklogDetail.findMany({
            where: {
                workPackageId: 'AMA00253MANT0001.1.1',
                issueKey: 'AIE-290'
            }
        });

        console.log('\n=== AIE-290 Check ===');
        if (worklogs.length > 0) {
            console.log(`✅ Found ${worklogs.length} worklogs for AIE-290!`);
            worklogs.forEach(w => {
                console.log(`  - ${w.year}-${String(w.month).padStart(2, '0')}: ${w.timeSpentHours}h`);
            });
        } else {
            console.log('❌ Still no worklogs for AIE-290');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

triggerAIESync();
