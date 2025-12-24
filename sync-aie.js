const { PrismaClient } = require('@prisma/client');
const { syncWorkPackage } = require('./app/actions/sync');

const prisma = new PrismaClient();

async function syncAIE() {
    try {
        // Find AIE Work Package
        const aieWP = await prisma.workPackage.findFirst({
            where: {
                jiraProjectKeys: { contains: 'AIE' }
            }
        });

        if (!aieWP) {
            console.log('❌ AIE Work Package not found');
            return;
        }

        console.log('Found AIE WP:', aieWP.id, '-', aieWP.name);
        console.log('Triggering sync...\n');

        const result = await syncWorkPackage(aieWP.id);

        console.log('\nSync result:', result);
        console.log('\nCheck sync-debug.log for detailed logs');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

syncAIE();
