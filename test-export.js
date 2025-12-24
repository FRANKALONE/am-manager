const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testExport() {
    try {
        console.log('🔍 Probando exportación...\n');

        const clients = await prisma.client.findMany({
            include: {
                workPackages: {
                    include: {
                        validityPeriods: {
                            orderBy: { startDate: 'desc' }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        console.log(`✅ Clientes cargados: ${clients.length}`);

        let totalWPs = 0;
        let totalPeriods = 0;

        for (const client of clients) {
            totalWPs += client.workPackages.length;
            for (const wp of client.workPackages) {
                totalPeriods += wp.validityPeriods.length;

                // Verificar campos problemáticos
                if (wp.validityPeriods.length > 0) {
                    const period = wp.validityPeriods[0];

                    // Verificar si hay algún campo undefined
                    const fields = [
                        'startDate', 'endDate', 'totalQuantity', 'scopeUnit', 'rate',
                        'isPremium', 'premiumPrice', 'correctionFactor',
                        'regularizationType', 'regularizationRate', 'surplusStrategy'
                    ];

                    fields.forEach(field => {
                        if (period[field] === undefined) {
                            console.log(`⚠️  ${wp.name}: campo ${field} es undefined`);
                        }
                    });
                }
            }
        }

        console.log(`✅ Work Packages: ${totalWPs}`);
        console.log(`✅ Periodos de validez: ${totalPeriods}`);
        console.log('\n✅ Exportación funcionaría correctamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testExport();
