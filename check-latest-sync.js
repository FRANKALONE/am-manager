const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestSync() {
    try {
        // Check current AIE WP config
        const aieWP = await prisma.workPackage.findUnique({
            where: { id: 'AMA00253MANT0001.1.1' }
        });

        console.log('=== AIE WP Current Config ===');
        console.log('Tempo Account ID (current):', aieWP.tempoAccountId);
        console.log('Old WP ID:', aieWP.oldWpId);
        console.log('');

        // Check all worklogs
        const allWorklogs = await prisma.worklogDetail.findMany({
            where: { workPackageId: 'AMA00253MANT0001.1.1' },
            orderBy: { issueKey: 'asc' }
        });

        const uniqueIssues = [...new Set(allWorklogs.map(w => w.issueKey))];

        console.log('=== Worklogs in Database ===');
        console.log('Total worklogs:', allWorklogs.length);
        console.log('Unique issues:', uniqueIssues.length);
        console.log('');

        // Check for AIE-290
        const aie290 = allWorklogs.filter(w => w.issueKey === 'AIE-290');

        if (aie290.length > 0) {
            console.log('✅ AIE-290 FOUND!');
            console.log('Worklogs:', aie290.length);
            aie290.forEach(w => {
                console.log(`  ${w.year}-${String(w.month).padStart(2, '0')}: ${w.timeSpentHours}h (${w.issueType})`);
            });
        } else {
            console.log('❌ AIE-290 NOT FOUND');
            console.log('');
            console.log('Checking for Evolutivos...');

            const evolutivos = allWorklogs.filter(w => w.issueType === 'Evolutivo');
            const uniqueEvolutivos = [...new Set(evolutivos.map(w => w.issueKey))];

            console.log('Evolutivos found:', uniqueEvolutivos.join(', '));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestSync();
