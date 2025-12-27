const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkValidTypes() {
    const params = await prisma.parameter.findMany({
        where: { category: 'VALID_TICKET_TYPE' }
    });

    console.log('Valid Ticket Types configured:');
    params.forEach(p => console.log('  -', p.value));

    console.log('\nNote: The sync should accept these types:');
    console.log('  - Any of the above valid types');
    console.log('  - Evolutivo with "T&M contra bolsa" billing mode');
    console.log('  - Servicio IAAS (if hasIaasService is true)');

    // Check if there are any worklogs in the system for AZZAM
    const worklogCount = await prisma.worklogDetail.count({
        where: { workPackageId: 'AMA00012MANT0001.1.1' }
    });

    console.log('\nCurrent worklogs in DB for AZZAM:', worklogCount);

    if (worklogCount > 0) {
        const sample = await prisma.worklogDetail.findMany({
            where: { workPackageId: 'AMA00012MANT0001.1.1' },
            take: 5,
            orderBy: { startDate: 'desc' }
        });

        console.log('\nSample worklogs:');
        sample.forEach(w => {
            console.log(`  - ${w.issueKey} (${w.issueType}): ${w.timeSpentHours}h on ${w.startDate.toISOString().split('T')[0]}`);
        });
    }
}

checkValidTypes().catch(console.error).finally(() => prisma.$disconnect());
