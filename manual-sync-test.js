// Simular el sync manualmente para ver errores
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manualSync() {
    console.log('=== Manual Sync Test ===\n');

    const wpId = 'AMA00188MANT0001.1.1';

    try {
        // Importar la función de sync
        const { syncWorkPackage } = require('./app/actions/sync.ts');

        console.log('Calling syncWorkPackage...');
        const result = await syncWorkPackage(wpId);

        console.log('\n✅ Sync completed');
        console.log('Result:', result);

    } catch (error) {
        console.log('\n❌ Sync failed');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }

    await prisma.$disconnect();
}

manualSync().catch(console.error);
