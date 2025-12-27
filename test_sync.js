const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSync() {
    // Import the sync function
    const { syncWorkPackage } = require('./app/actions/sync.ts');

    console.log('Starting sync for AZZAM WP...');
    const result = await syncWorkPackage('AMA00012MANT0001.1.1', true); // true = debug mode

    console.log('\n=== SYNC RESULT ===');
    console.log('Success:', result.success);
    console.log('Total Hours:', result.totalHours);
    console.log('Processed:', result.processed);

    if (result.logs) {
        console.log('\n=== SYNC LOGS ===');
        result.logs.forEach(log => console.log(log));
    }

    if (result.error) {
        console.log('\nERROR:', result.error);
    }
}

testSync().catch(console.error).finally(() => prisma.$disconnect());
