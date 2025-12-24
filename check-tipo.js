const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTipoImputacion() {
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: 'CSE00081MANT0001.1.1',
            year: 2025,
            month: 2
        },
        select: {
            issueKey: true,
            issueType: true,
            timeSpentHours: true,
            tipoImputacion: true,
            author: true
        },
        take: 5
    });

    console.log('Sample worklogs from Feb 2025:');
    console.log(JSON.stringify(worklogs, null, 2));

    const withTipo = worklogs.filter(w => w.tipoImputacion !== null).length;
    console.log(`\nWorklogs with Tipo Imputación: ${withTipo}/${worklogs.length}`);

    await prisma.$disconnect();
}

checkTipoImputacion();
