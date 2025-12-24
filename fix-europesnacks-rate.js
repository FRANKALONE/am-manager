const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEuropesnacks() {
    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'Europesnacks' } },
        include: { validityPeriods: { orderBy: { startDate: 'desc' } } }
    });

    if (!wp) {
        console.log('❌ No se encontró Europesnacks');
        return;
    }

    const currentPeriod = wp.validityPeriods[0];
    console.log('📅 Periodo actual:', currentPeriod.id);
    console.log('   Tipo Reg:', currentPeriod.regularizationType);
    console.log('   Tarifa Reg ANTES:', currentPeriod.regularizationRate);

    // Actualizar con la tarifa de 50€
    await prisma.validityPeriod.update({
        where: { id: currentPeriod.id },
        data: { regularizationRate: 50 }
    });

    console.log('\n✅ Actualizado a 50€');

    // Verificar
    const updated = await prisma.validityPeriod.findUnique({
        where: { id: currentPeriod.id }
    });
    console.log('   Tarifa Reg DESPUÉS:', updated.regularizationRate);

    await prisma.$disconnect();
}

fixEuropesnacks();
