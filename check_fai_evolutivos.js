// Script to check FAI-411 and FAI-451 worklogs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFaiEvolutivos() {
    console.log('=== Checking FAI-411 and FAI-451 ===\n');

    // Find FAIN WP
    const wp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' }
        }
    });

    if (!wp) {
        console.log('FAIN WP not found');
        return;
    }

    console.log(`WP ID: ${wp.id}\n`);

    // Check WorklogDetails for FAI-411
    const fai411 = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            issueKey: 'FAI-411'
        }
    });

    console.log(`FAI-411 WorklogDetails: ${fai411.length}`);
    fai411.forEach(w => {
        console.log(`  ${w.month}/${w.year}: ${w.timeSpentHours}h (${w.issueType})`);
    });

    // Check WorklogDetails for FAI-451
    const fai451 = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            issueKey: 'FAI-451'
        }
    });

    console.log(`\nFAI-451 WorklogDetails: ${fai451.length}`);
    fai451.forEach(w => {
        console.log(`  ${w.month}/${w.year}: ${w.timeSpentHours}h (${w.issueType})`);
    });

    // Check if there's an EVOLUTIVO WP for FAIN
    const evoWp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' },
            contractType: 'EVOLUTIVO'
        }
    });

    console.log(`\nEVOLUTIVO WP for FAIN: ${evoWp ? evoWp.id : 'NOT FOUND'}`);

    if (evoWp) {
        // Check worklogs in EVOLUTIVO WP
        const evoWorklogs = await prisma.worklogDetail.findMany({
            where: { workPackageId: evoWp.id },
            orderBy: [{ year: 'asc' }, { month: 'asc' }]
        });

        console.log(`\nWorklogs in EVOLUTIVO WP: ${evoWorklogs.length}`);
        evoWorklogs.forEach(w => {
            console.log(`  ${w.month}/${w.year}: ${w.issueKey} - ${w.timeSpentHours}h`);
        });
    }

    await prisma.$disconnect();
}

checkFaiEvolutivos().catch(console.error);
