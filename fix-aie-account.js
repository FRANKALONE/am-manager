const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAIEAccount() {
    try {
        const result = await prisma.workPackage.update({
            where: { id: 'AMA00253MANT0001.1.1' },
            data: {
                tempoAccountId: 'AMA00253MANT0001.1.1'
            }
        });

        console.log('✅ Updated AIE WP Tempo Account ID');
        console.log('Old value: 2380');
        console.log('New value: AMA00253MANT0001.1.1');
        console.log('\nWP:', result.name);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAIEAccount();
