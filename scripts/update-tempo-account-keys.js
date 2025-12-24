const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTempoAccountIds() {
    try {
        // Update the WP with tempoAccountId 1129 to use the KEY instead
        const result = await prisma.workPackage.updateMany({
            where: {
                id: 'CSE00081MANT0001.1.1'
            },
            data: {
                tempoAccountId: 'CSE00081MANT0001.1.1'
            }
        });

        console.log(`✅ Updated ${result.count} Work Package(s)`);
        console.log(`   Set tempoAccountId to: CSE00081MANT0001.1.1`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTempoAccountIds();
