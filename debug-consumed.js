const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugConsumed() {
    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'Europesnacks' } },
        include: {
            validityPeriods: { orderBy: { startDate: 'desc' } },
            monthlyMetrics: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
            regularizations: { orderBy: { date: 'asc' } }
        }
    });

    if (!wp) {
        console.log('❌ No se encontró Europesnacks');
        return;
    }

    const currentPeriod = wp.validityPeriods[0];
    const periodStart = new Date(currentPeriod.startDate);
    const periodEnd = new Date(currentPeriod.endDate);

    console.log('📦 Work Package:', wp.name);
    console.log('📅 Periodo:', periodStart.toISOString().split('T')[0], '-', periodEnd.toISOString().split('T')[0]);
    console.log('\n=== CÁLCULO DEL CONSUMIDO ===\n');

    // 1. Métricas del periodo
    console.log('1️⃣ Métricas mensuales del periodo:');
    let totalMetrics = 0;
    wp.monthlyMetrics.forEach(m => {
        const metricDate = new Date(m.year, m.month - 1, 1);
        if (metricDate >= periodStart && metricDate <= periodEnd) {
            console.log(`   ${m.month.toString().padStart(2, '0')}/${m.year}: ${m.consumedHours}h`);
            totalMetrics += m.consumedHours;
        }
    });
    console.log(`   TOTAL MÉTRICAS: ${totalMetrics}h`);

    // 2. Regularizaciones del periodo
    console.log('\n2️⃣ Regularizaciones del periodo:');
    let returnTotal = 0;
    let manualTotal = 0;

    wp.regularizations.forEach(r => {
        const regDate = new Date(r.date);
        if (regDate >= periodStart && regDate <= periodEnd) {
            console.log(`   ${r.date.toISOString().split('T')[0]}: ${r.type} ${r.quantity}h`);
            if (r.type === 'RETURN') returnTotal += r.quantity;
            if (r.type === 'MANUAL_CONSUMPTION') manualTotal += r.quantity;
        }
    });
    console.log(`   TOTAL RETURN: ${returnTotal}h`);
    console.log(`   TOTAL MANUAL_CONSUMPTION: ${manualTotal}h`);

    // 3. Cálculo final
    console.log('\n3️⃣ Cálculo final:');
    console.log(`   Métricas del periodo: ${totalMetrics}h`);
    console.log(`   - Devoluciones (RETURN): -${returnTotal}h`);
    console.log(`   + Consumos Manuales: +${manualTotal}h`);
    console.log(`   ─────────────────────────────`);
    const totalConsumed = totalMetrics - returnTotal + manualTotal;
    console.log(`   TOTAL CONSUMIDO: ${totalConsumed}h`);

    console.log('\n📊 Comparación:');
    console.log(`   Acumulado total WP: ${wp.accumulatedHours}h`);
    console.log(`   Consumido del periodo: ${totalConsumed}h`);

    await prisma.$disconnect();
}

debugConsumed();
