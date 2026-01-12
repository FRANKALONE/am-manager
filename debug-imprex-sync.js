const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Diagnóstico IMPREX WP ===\n');

    // 1. Buscar el WP
    const wp = await prisma.workPackage.findUnique({
        where: { id: 'AMA00188EVOL0010.1.1' },
        include: {
            monthlyMetrics: {
                where: {
                    year: 2025,
                    month: 6
                }
            },
            tickets: {
                where: {
                    issueKey: 'IMP-1218'
                }
            },
            validityPeriods: true
        }
    });

    if (!wp) {
        console.log('❌ WP no encontrado');
        return;
    }

    console.log('✅ WP encontrado:', wp.name);
    console.log('   ID:', wp.id);
    console.log('   Tipo de contrato:', wp.contractType);
    console.log('   Proyecto Jira:', wp.jiraProjectKeys);
    console.log('   Include Evo Estimates:', wp.includeEvoEstimates);
    console.log('   Include Evo T&M:', wp.includeEvoTM);
    console.log('   Tipos de ticket:', wp.includedTicketTypes);
    console.log('   Última sincronización:', wp.lastSyncedAt);
    console.log('');

    // 2. Verificar períodos de validez
    console.log('📅 Períodos de validez:');
    wp.validityPeriods.forEach(p => {
        console.log(`   ${p.startDate.toISOString().split('T')[0]} - ${p.endDate.toISOString().split('T')[0]}`);
    });
    console.log('');

    // 3. Verificar MonthlyMetrics para junio 2025
    console.log('📊 MonthlyMetrics para 06/2025:');
    if (wp.monthlyMetrics.length > 0) {
        wp.monthlyMetrics.forEach(m => {
            console.log(`   ${m.month}/${m.year}: ${m.consumedHours}h`);
        });
    } else {
        console.log('   ❌ No hay métricas para 06/2025');
    }
    console.log('');

    // 4. Verificar si existe el ticket IMP-1218
    console.log('🎫 Ticket IMP-1218:');
    if (wp.tickets.length > 0) {
        wp.tickets.forEach(t => {
            console.log(`   ✅ Encontrado: ${t.issueKey}`);
            console.log(`      Tipo: ${t.issueType}`);
            console.log(`      Billing Mode: ${t.billingMode}`);
            console.log(`      Creado: ${t.createdDate}`);
            console.log(`      Mes: ${t.month}/${t.year}`);
        });
    } else {
        console.log('   ❌ Ticket IMP-1218 NO encontrado en la BD');
    }
    console.log('');

    // 5. Buscar todos los tickets del WP en junio 2025
    const allTicketsJune = await prisma.ticket.findMany({
        where: {
            workPackageId: 'AMA00188EVOL0010.1.1',
            year: 2025,
            month: 6
        }
    });

    console.log(`📋 Total de tickets en 06/2025: ${allTicketsJune.length}`);
    allTicketsJune.forEach(t => {
        console.log(`   - ${t.issueKey}: ${t.issueType} (${t.billingMode})`);
    });
    console.log('');

    // 6. Buscar WorklogDetails para junio 2025
    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: 'AMA00188EVOL0010.1.1',
            year: 2025,
            month: 6
        }
    });

    console.log(`⏱️  WorklogDetails en 06/2025: ${worklogs.length}`);
    worklogs.forEach(w => {
        console.log(`   - ${w.issueKey}: ${w.timeSpentHours}h (${w.issueType})`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
