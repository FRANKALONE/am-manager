const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseINS() {
    console.log('=== DIAGNOSIS: INS Evolutivos ===\n');

    // 1. Check database
    const dbTickets = await prisma.ticket.findMany({
        where: {
            workPackageId: 'AMA30200MANT0001.1.1',
            issueType: { in: ['Evolutivo', 'Hitos Evolutivos'] }
        },
        orderBy: { issueKey: 'asc' }
    });

    console.log(`Database has ${dbTickets.length} tickets:`);
    const evolutivos = dbTickets.filter(t => t.issueType === 'Evolutivo');
    const hitos = dbTickets.filter(t => t.issueType === 'Hitos Evolutivos');

    console.log(`\nEVOLUTIVOS (${evolutivos.length}):`);
    evolutivos.forEach(t => console.log(`  - ${t.issueKey}: ${t.issueSummary}`));

    console.log(`\nHITOS (${hitos.length}):`);
    hitos.forEach(t => console.log(`  - ${t.issueKey}: ${t.issueSummary}`));

    // 2. Expected tickets
    console.log('\n\nEXPECTED EVOLUTIVOS (from user):');
    console.log('  - INS-799: PROGRAMA DATOS ZPARTE');
    console.log('  - INS-755: CAMBIOS SEPA 2025');
    console.log('  - INS-626: Factura electrónica de Alemania');
    console.log('  - INS-538: Proyecto mejoras C4C');

    await prisma.$disconnect();
}

diagnoseINS().catch(console.error);
