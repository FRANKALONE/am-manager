const { PrismaClient } = require('@prisma/client');
const { syncWorkPackage } = require('./app/actions/sync');

const prisma = new PrismaClient();

async function testSync() {
    console.log('Finding IMPREX WP...\n');

    const wp = await prisma.workPackage.findFirst({
        where: {
            contractType: {
                contains: 'Eventos'
            }
        }
    });

    if (!wp) {
        console.log('❌ No Events WP found');
        return;
    }

    console.log(`Found WP: ${wp.name} (${wp.id})`);
    console.log(`Contract Type: ${wp.contractType}`);
    console.log(`\nRunning sync...\n`);

    try {
        const result = await syncWorkPackage(wp.id);
        console.log('\n✅ Sync completed');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('\n❌ Sync failed');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }

    await prisma.$disconnect();
}

testSync().catch(console.error);
