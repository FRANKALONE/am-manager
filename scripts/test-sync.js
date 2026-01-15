
const { syncWorkPackage } = require('../app/actions/sync');
const { PrismaClient } = require('@prisma/client');

async function testSync() {
    const wpId = 'NOVIS - Mant. Funcional';
    console.log(`Starting test sync for: ${wpId}`);

    try {
        const result = await syncWorkPackage(wpId, true, 180);
        console.log('Sync Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

testSync();
