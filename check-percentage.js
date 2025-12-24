const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPercentage() {
    const wp = await prisma.workPackage.findFirst({
        where: { name: { contains: 'Europesnacks' } },
        include: {
            validityPeriods: { orderBy: { startDate: 'desc' } },
            monthlyMetrics: { orderBy: [{ year: 'asc' }, { month: 'asc' }] },
            regularizations: { orderBy: { date: 'asc' } }
        }
    });

    const currentPeriod = wp.validityPeriods[0];
    const periodStart = new Date(currentPeriod.startDate);
    const periodEnd = new Date(currentPeriod.endDate);

    console.log('📊 Cálculo de Porcentaje para Europesnacks\n');

    // Simular el cálculo del dashboard
    let totalContracted = 0;
    let totalRegularization = 0;
    let totalConsumed = 0;

    const periodStartMonth = periodStart.getMonth() + 1;
    const periodStartYear = periodStart.getFullYear();
    const periodEndMonth = periodEnd.getMonth() + 1;
    const periodEndYear = periodEnd.getFullYear();

    // Iterar por cada mes del periodo
    let iterDate = new Date(periodStart);
    iterDate.setDate(1);

    const totalMonths = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 + (periodEnd.getMonth() - periodStart.getMonth()) + 1;
    const monthlyContracted = totalMonths > 0 ? (currentPeriod.totalQuantity || 0) / totalMonths : 0;

    console.log(`Total del periodo: ${currentPeriod.totalQuantity}h`);
    console.log(`Meses del periodo: ${totalMonths}`);
    console.log(`Contratado mensual: ${monthlyContracted}h\n`);

    while (iterDate <= periodEnd) {
        const m = iterDate.getMonth() + 1;
        const y = iterDate.getFullYear();

        // Contratado del mes
        totalContracted += monthlyContracted;

        // Consumido del mes
        const metric = wp.monthlyMetrics.find(met => met.month === m && met.year === y);
        let consumed = metric ? metric.consumedHours : 0;

        // Regularizaciones del mes
        const regs = wp.regularizations.filter(reg => {
            const regDate = new Date(reg.date);
            return regDate.getMonth() + 1 === m && regDate.getFullYear() === y;
        });

        const returnTotal = regs.filter(r => r.type === 'RETURN').reduce((sum, r) => sum + r.quantity, 0);
        consumed = consumed - returnTotal;

        const regTotal = regs.filter(r => r.type === 'EXCESS').reduce((sum, r) => sum + r.quantity, 0);
        totalRegularization += regTotal;

        totalConsumed += consumed;

        console.log(`${m.toString().padStart(2, '0')}/${y}: Contratado=${monthlyContracted.toFixed(2)}h, Consumido=${consumed.toFixed(2)}h, Reg=${regTotal.toFixed(2)}h`);

        iterDate.setMonth(iterDate.getMonth() + 1);
    }

    const totalScope = totalContracted + totalRegularization;
    const percentage = totalScope > 0 ? (totalConsumed / totalScope) * 100 : 0;

    console.log('\n=== TOTALES ===');
    console.log(`Total Contratado: ${totalContracted.toFixed(2)}h`);
    console.log(`Total Regularización: ${totalRegularization.toFixed(2)}h`);
    console.log(`Total Scope: ${totalScope.toFixed(2)}h`);
    console.log(`Total Consumido: ${totalConsumed.toFixed(2)}h`);
    console.log(`\nPorcentaje: ${percentage.toFixed(10)}%`);
    console.log(`Redondeado a 1 decimal: ${percentage.toFixed(1)}%`);

    await prisma.$disconnect();
}

checkPercentage();
