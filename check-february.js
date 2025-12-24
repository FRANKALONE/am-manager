const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFebruary() {
    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'Europesnacks' } },
        include: {
            monthlyMetrics: {
                where: { year: 2025, month: 2 }
            }
        }
    });

    console.log('📅 Febrero 2025:');
    if (wp.monthlyMetrics.length === 0) {
        console.log('   ❌ NO HAY MÉTRICAS para febrero 2025');
        console.log('   Esto es correcto si el periodo empieza el 01/02/2025');
        console.log('   y aún no se ha sincronizado febrero.');
    } else {
        wp.monthlyMetrics.forEach(m => {
            console.log(`   ✅ ${m.month}/${m.year}: ${m.consumedHours}h`);
        });
    }

    // Verificar si hay worklogs de febrero
    const febWorklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wp.id,
            year: 2025,
            month: 2
        }
    });

    console.log(`\n📊 Worklogs de febrero: ${febWorklogs.length} registros`);
    if (febWorklogs.length > 0) {
        const totalFeb = febWorklogs.reduce((sum, w) => sum + w.timeSpentHours, 0);
        console.log(`   Total horas: ${totalFeb}h`);
    }

    await prisma.$disconnect();
}

checkFebruary();
