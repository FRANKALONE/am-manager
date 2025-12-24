const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIEConfig() {
    try {
        const aieWP = await prisma.workPackage.findFirst({
            where: {
                jiraProjectKeys: { contains: 'AIE' }
            },
            include: {
                validityPeriods: {
                    orderBy: { startDate: 'asc' }
                }
            }
        });

        if (!aieWP) {
            console.log('❌ AIE WP not found');
            return;
        }

        console.log('\n=== AIE Work Package Configuration ===');
        console.log('ID:', aieWP.id);
        console.log('Name:', aieWP.name);
        console.log('Tempo Account ID (current):', aieWP.tempoAccountId || 'NOT SET');
        console.log('Old WP ID:', aieWP.oldWpId || 'NOT SET');
        console.log('JIRA Project Keys:', aieWP.jiraProjectKeys);

        console.log('\n=== Validity Periods ===');
        aieWP.validityPeriods.forEach((period, idx) => {
            console.log(`Period ${idx + 1}:`);
            console.log(`  Start: ${period.startDate.toISOString().split('T')[0]}`);
            console.log(`  End: ${period.endDate.toISOString().split('T')[0]}`);
        });

        // Check if October 2024 is covered
        const oct2024Start = new Date('2024-10-01');
        const oct2024End = new Date('2024-10-31');

        const coveringPeriod = aieWP.validityPeriods.find(p => {
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            return pStart <= oct2024End && pEnd >= oct2024Start;
        });

        console.log('\n=== October 2024 Coverage ===');
        if (coveringPeriod) {
            console.log('✅ October 2024 IS covered by a validity period');
            console.log(`   Period: ${coveringPeriod.startDate.toISOString().split('T')[0]} to ${coveringPeriod.endDate.toISOString().split('T')[0]}`);
        } else {
            console.log('❌ October 2024 is NOT covered by any validity period');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAIEConfig();
