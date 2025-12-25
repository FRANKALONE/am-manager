const { syncWorkPackage } = require('./app/actions/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00065MANT0001.1.1';
    console.log(`Starting local sync simulation for ${wpId}...`);

    try {
        const result = await syncWorkPackage(wpId);
        console.log('Sync Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Sync crashed:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
