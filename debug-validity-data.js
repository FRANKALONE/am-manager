// Script de diagnóstico para verificar datos de validez de contratos
// Ejecutar con: node debug-validity-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugValidityData() {
    console.log('=== DIAGNÓSTICO DE DATOS DE VALIDEZ ===\n');

    // 1. Contar clientes
    const clientCount = await prisma.client.count();
    console.log(`Total de clientes: ${clientCount}`);

    // 2. Contar Work Packages
    const wpCount = await prisma.workPackage.count();
    console.log(`Total de Work Packages: ${wpCount}`);

    // 3. Contar Validity Periods
    const vpCount = await prisma.validityPeriod.count();
    console.log(`Total de Validity Periods: ${vpCount}\n`);

    if (vpCount === 0) {
        console.log('⚠️  NO HAY VALIDITY PERIODS EN LA BASE DE DATOS');
        console.log('Los Work Packages necesitan tener al menos un período de validez para mostrarse en el timeline.\n');
    }

    // 4. Mostrar algunos ejemplos de WPs con sus períodos
    const sampleWPs = await prisma.workPackage.findMany({
        take: 5,
        include: {
            validityPeriods: true,
            client: {
                select: {
                    name: true
                }
            }
        }
    });

    console.log('=== MUESTRA DE WORK PACKAGES ===\n');
    sampleWPs.forEach((wp, index) => {
        console.log(`${index + 1}. ${wp.client.name} - ${wp.name}`);
        console.log(`   Tipo: ${wp.contractType} | Renovación: ${wp.renewalType}`);
        console.log(`   Períodos de validez: ${wp.validityPeriods.length}`);

        if (wp.validityPeriods.length > 0) {
            wp.validityPeriods.forEach((vp, vpIndex) => {
                const start = new Date(vp.startDate).toLocaleDateString('es-ES');
                const end = new Date(vp.endDate).toLocaleDateString('es-ES');
                const premium = vp.isPremium ? '⭐ PREMIUM' : 'STANDARD';
                console.log(`      ${vpIndex + 1}. ${start} → ${end} (${premium})`);
                console.log(`         Cantidad: ${vp.totalQuantity} ${vp.scopeUnit || 'horas'} | Tarifa: ${vp.rate}€`);
            });
        } else {
            console.log('      ⚠️  Sin períodos de validez');
        }
        console.log('');
    });

    // 5. Verificar rangos de fechas
    const allPeriods = await prisma.validityPeriod.findMany({
        select: {
            startDate: true,
            endDate: true,
            isPremium: true
        },
        orderBy: {
            startDate: 'asc'
        }
    });

    if (allPeriods.length > 0) {
        const firstStart = new Date(allPeriods[0].startDate);
        const lastEnd = new Date(allPeriods[allPeriods.length - 1].endDate);

        console.log('=== RANGO DE FECHAS ===');
        console.log(`Primer período inicia: ${firstStart.toLocaleDateString('es-ES')}`);
        console.log(`Último período termina: ${lastEnd.toLocaleDateString('es-ES')}`);
        console.log(`\nPremium: ${allPeriods.filter(p => p.isPremium).length}`);
        console.log(`Standard: ${allPeriods.filter(p => !p.isPremium).length}`);
    }

    await prisma.$disconnect();
}

debugValidityData().catch(console.error);
