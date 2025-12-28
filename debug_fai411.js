const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log('--- BUSCANDO REGULARIZACIONES (MANUAL_CONSUMPTION) ---');
    const regs = await prisma.regularization.findMany({
        where: {
            ticketId: 'FAI-411',
            date: {
                gte: new Date(2025, 8, 1),
                lte: new Date(2025, 8, 30)
            }
        }
    });
    console.log('Regularizaciones encontradas:', JSON.stringify(regs, null, 2));

    console.log('\n--- BUSCANDO WORKLOG_DETAILS ---');
    const details = await prisma.worklogDetail.findMany({
        where: {
            issueKey: 'FAI-411',
            year: 2025,
            month: 9
        }
    });
    console.log('Worklog Details encontrados:', JSON.stringify(details, null, 2));

    console.log('\n--- BUSCANDO MONTHLY_METRICS PARA EL WP ---');
    if (details.length > 0) {
        const wpId = details[0].workPackageId;
        const metrics = await prisma.monthlyMetric.findMany({
            where: {
                workPackageId: wpId,
                year: 2025,
                month: 9
            }
        });
        console.log(`Métricas para WP ${wpId}:`, JSON.stringify(metrics, null, 2));
    }

    await prisma.$disconnect();
}

checkData();
