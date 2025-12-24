const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorklogs() {
    const grouped = await prisma.worklogDetail.groupBy({
        by: ['workPackageId', 'year', 'month'],
        _count: true,
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    console.log('Worklogs by WP/Year/Month:');
    grouped.forEach(g => {
        console.log(`${g.workPackageId} - ${g.year}/${g.month}: ${g._count} worklogs`);
    });

    await prisma.$disconnect();
}

checkWorklogs();
