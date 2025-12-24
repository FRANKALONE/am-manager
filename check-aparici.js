const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApariciWP() {
    try {
        const apariciWP = await prisma.workPackage.findFirst({
            where: {
                OR: [
                    { name: { contains: 'APARICI' } },
                    { clientName: { contains: 'APARICI' } }
                ]
            },
            include: {
                validityPeriods: true,
                worklogDetails: true
            }
        });

        if (!apariciWP) {
            console.log('❌ APARICI WP not found');
            return;
        }

        console.log('=== APARICI Work Package ===');
        console.log('ID:', apariciWP.id);
        console.log('Name:', apariciWP.name);
        console.log('Tempo Account ID (current):', apariciWP.tempoAccountId || 'NOT SET');
        console.log('Old WP ID:', apariciWP.oldWpId || 'NOT SET');
        console.log('JIRA Project Keys:', apariciWP.jiraProjectKeys);

        console.log('\n=== Validity Periods ===');
        apariciWP.validityPeriods.forEach((period, idx) => {
            console.log(`Period ${idx + 1}: ${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]}`);
        });

        console.log('\n=== Worklogs ===');
        console.log('Total worklogs:', apariciWP.worklogDetails.length);

        if (apariciWP.worklogDetails.length > 0) {
            const uniqueIssues = [...new Set(apariciWP.worklogDetails.map(w => w.issueKey))];
            console.log('Unique issues:', uniqueIssues.length);

            const evolutivos = apariciWP.worklogDetails.filter(w => w.issueType === 'Evolutivo');
            console.log('Evolutivo worklogs:', evolutivos.length);

            if (evolutivos.length > 0) {
                const uniqueEvolutivos = [...new Set(evolutivos.map(w => w.issueKey))];
                console.log('Unique Evolutivos:', uniqueEvolutivos.join(', '));
            }
        } else {
            console.log('❌ No worklogs found');
            console.log('\nThis could be because:');
            console.log('1. The Tempo Account is archived');
            console.log('2. The Account IDs are incorrect');
            console.log('3. The date range doesn\'t match the validity periods');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkApariciWP();
