const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAzzam() {
    const wp = await prisma.workPackage.findUnique({
        where: { id: 'AMA00012MANT0001.1.1' },
        include: {
            validityPeriods: true
        }
    });

    console.log('WP Info:');
    console.log('- ID:', wp.id);
    console.log('- Name:', wp.name);
    console.log('- Tempo Account ID:', wp.tempoAccountId);
    console.log('- Old WP ID:', wp.oldWpId);
    console.log('- Jira Project Keys:', wp.jiraProjectKeys);
    console.log('- Contract Type:', wp.contractType);
    console.log('- Validity Periods:', wp.validityPeriods.length);

    // Check what account IDs would be used
    const accountIds = new Set();
    accountIds.add(wp.id);
    if (wp.id.startsWith('AMA')) {
        accountIds.add(wp.id.replace(/^AMA/, 'CSE'));
    }
    if (wp.tempoAccountId) accountIds.add(wp.tempoAccountId);
    if (wp.oldWpId) accountIds.add(wp.oldWpId);

    console.log('\nAccount IDs that would be queried in Tempo:');
    Array.from(accountIds).forEach(id => console.log('  -', id));
}

debugAzzam().catch(console.error).finally(() => prisma.$disconnect());
