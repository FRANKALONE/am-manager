const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIE290() {
    try {
        // Find AIE Work Package
        const aieWP = await prisma.workPackage.findFirst({
            where: {
                OR: [
                    { name: { contains: 'AIE' } },
                    { jiraProjectKeys: { contains: 'AIE' } }
                ]
            },
            include: {
                worklogDetails: {
                    where: {
                        issueKey: { contains: '290' }
                    }
                }
            }
        });

        console.log('\n=== AIE Work Package ===');
        if (aieWP) {
            console.log('WP ID:', aieWP.id);
            console.log('WP Name:', aieWP.name);
            console.log('Contract Type:', aieWP.contractType);
            console.log('Billing Type:', aieWP.billingType);
            console.log('JIRA Project Keys:', aieWP.jiraProjectKeys);

            console.log('\n=== AIE-290 Worklogs ===');
            if (aieWP.worklogDetails.length > 0) {
                console.log(`Found ${aieWP.worklogDetails.length} worklogs for tickets containing '290':`);
                aieWP.worklogDetails.forEach(wl => {
                    console.log(`- ${wl.issueKey}: ${wl.timeSpentHours}h (${wl.issueType}) - ${wl.issueSummary}`);
                });
            } else {
                console.log('❌ No worklogs found for AIE-290');
            }
        } else {
            console.log('❌ AIE Work Package not found');
        }

        // Search all worklogs for AIE-290
        const allAIE290Worklogs = await prisma.worklogDetail.findMany({
            where: {
                issueKey: 'AIE-290'
            }
        });

        console.log('\n=== All AIE-290 Worklogs (any WP) ===');
        if (allAIE290Worklogs.length > 0) {
            console.log(`Found ${allAIE290Worklogs.length} worklogs:`);
            allAIE290Worklogs.forEach(wl => {
                console.log(`- WP: ${wl.workPackageId}, Hours: ${wl.timeSpentHours}, Type: ${wl.issueType}, Date: ${wl.startDate}`);
            });
        } else {
            console.log('❌ No worklogs found for AIE-290 in any Work Package');
            console.log('\nThis means either:');
            console.log('1. AIE-290 has no worklogs in Tempo');
            console.log('2. AIE-290 is not of a valid ticket type');
            console.log('3. AIE-290 has a billing mode that is not "Bolsa de Horas" or "T&M contra bolsa"');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAIE290();
