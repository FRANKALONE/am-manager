// Test date filtering logic
const periodStart = new Date('2025-02-01');
const periodEnd = new Date('2026-01-31');

console.log('Periodo:', periodStart.toISOString(), '-', periodEnd.toISOString());
console.log('\nProbando filtro de fechas:\n');

const testMonths = [
    { year: 2025, month: 2 },
    { year: 2025, month: 3 },
    { year: 2025, month: 12 },
    { year: 2026, month: 1 }
];

testMonths.forEach(m => {
    const metricDate = new Date(m.year, m.month - 1, 1);
    const included = metricDate >= periodStart && metricDate <= periodEnd;
    console.log(`${m.month.toString().padStart(2, '0')}/${m.year}:`);
    console.log(`  metricDate: ${metricDate.toISOString()}`);
    console.log(`  >= periodStart: ${metricDate >= periodStart}`);
    console.log(`  <= periodEnd: ${metricDate <= periodEnd}`);
    console.log(`  INCLUIDO: ${included ? '✅' : '❌'}\n`);
});
