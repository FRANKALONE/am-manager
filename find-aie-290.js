const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAIE290() {
    try {
        // Get all worklog details for AIE WP
        const aieWP = await prisma.workPackage.findFirst({
            where: { jiraProjectKeys: { contains: 'AIE' } }
        });

        if (!aieWP) {
            console.log('❌ AIE WP not found');
            return;
        }

        const allWorklogs = await prisma.worklogDetail.findMany({
            where: { workPackageId: aieWP.id },
            orderBy: { issueKey: 'asc' }
        });

        console.log(`\n=== Total worklogs for AIE WP: ${allWorklogs.length} ===\n`);

        // Get unique issue keys
        const uniqueIssues = [...new Set(allWorklogs.map(w => w.issueKey))];
        console.log(`Unique issues: ${uniqueIssues.length}`);
        console.log('Issues:', uniqueIssues.sort().join(', '));

        // Check for AIE-290
        const aie290Worklogs = allWorklogs.filter(w => w.issueKey === 'AIE-290');

        console.log('\n=== AIE-290 Search ===');
        if (aie290Worklogs.length > 0) {
            console.log(`✅ Found ${aie290Worklogs.length} worklogs for AIE-290:`);
            aie290Worklogs.forEach(w => {
                console.log(`  - ${w.year}-${String(w.month).padStart(2, '0')}: ${w.timeSpentHours}h (${w.issueType})`);
            });
        } else {
            console.log('❌ No worklogs found for AIE-290');

            // Check for similar keys
            const similar = uniqueIssues.filter(k => k.includes('290'));
            if (similar.length > 0) {
                console.log('\nIssues containing "290":', similar.join(', '));
            }
        }

        // Show all Evolutivos
        const evolutivos = allWorklogs.filter(w => w.issueType === 'Evolutivo');
        const uniqueEvolutivos = [...new Set(evolutivos.map(w => w.issueKey))];

        console.log('\n=== Evolutivos in AIE WP ===');
        console.log(`Total Evolutivo worklogs: ${evolutivos.length}`);
        console.log(`Unique Evolutivos: ${uniqueEvolutivos.length}`);
        console.log('Evolutivos:', uniqueEvolutivos.sort().join(', '));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findAIE290();
