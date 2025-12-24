const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFebruary() {
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: 'CSE00081MANT0001.1.1',
            year: 2025,
            month: 2
        },
        select: {
            issueKey: true,
            issueType: true,
            timeSpentHours: true
        }
    });

    console.log(`Found ${worklogs.length} worklogs for CSE00081MANT0001.1.1 in Feb 2025`);
    console.log('Sample:', JSON.stringify(worklogs.slice(0, 3), null, 2));

    await prisma.$disconnect();
}

checkFebruary();
