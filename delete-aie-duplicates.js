const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAIEDuplicates() {
    try {
        console.log('\n🗑️  Deleting duplicate AIE Work Packages...\n');

        // Delete CSE00253MANT0001.1.1 (no Tempo ID)
        const delete1 = await prisma.workPackage.delete({
            where: { id: 'CSE00253MANT0001.1.1' }
        });
        console.log('✅ Deleted:', delete1.id, '-', delete1.name);

        // Delete TEST001 (test WP)
        const delete2 = await prisma.workPackage.delete({
            where: { id: 'TEST001' }
        });
        console.log('✅ Deleted:', delete2.id, '-', delete2.name);

        console.log('\n✅ Cleanup complete! Only AMA00253MANT0001.1.1 remains.\n');

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

deleteAIEDuplicates();
