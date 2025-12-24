const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTempoAccountKey() {
    try {
        const result = await prisma.workPackage.update({
            where: {
                id: 'CSE00081MANT0001.1.1'
            },
            data: {
                tempoAccountId: 'CSE00081MANT0001.1.1'
            }
        });

        console.log(`✅ Updated Work Package: ${result.name}`);
        console.log(`   Old value: 1129 (numeric ID)`);
        console.log(`   New value: ${result.tempoAccountId} (account KEY)`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTempoAccountKey();
