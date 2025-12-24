const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEuropesnacks() {
    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'Europesnacks' } },
        include: {
            validityPeriods: { orderBy: { startDate: 'desc' } },
            monthlyMetrics: true,
            regularizations: true
        }
    });

    if (!wp) {
        console.log('❌ No se encontró Europesnacks');
        return;
    }

    console.log('📦 Work Package:', wp.name);
    console.log('\n📅 Periodos de Validez:');
    wp.validityPeriods.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.startDate.toISOString().split('T')[0]} - ${p.endDate.toISOString().split('T')[0]}`);
        console.log(`     Tipo Reg: ${p.regularizationType || 'NO CONFIGURADO'}`);
        console.log(`     Tarifa Reg: ${p.regularizationRate || 'NO CONFIGURADO'}€`);
    });

    console.log('\n💰 Acumulado Total:', wp.accumulatedHours, 'h');

    console.log('\n📊 Regularizaciones:');
    wp.regularizations.forEach(r => {
        console.log(`  - ${r.date.toISOString().split('T')[0]}: ${r.type} ${r.quantity}h`);
    });

    await prisma.$disconnect();
}

checkEuropesnacks();
