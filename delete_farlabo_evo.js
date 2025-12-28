// Script to delete FARLABO EVOLUTIVO WP
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteFarlaboEvoWP() {
    const wpId = 'EVO-1000085';

    console.log(`Deleting WP: ${wpId}`);

    // Delete the WP (cascade will delete related records)
    await prisma.workPackage.delete({
        where: { id: wpId }
    });

    console.log('WP deleted successfully');

    await prisma.$disconnect();
}

deleteFarlaboEvoWP().catch(console.error);
