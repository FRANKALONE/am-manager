// Script to delete FAIN EVOLUTIVO WP
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteFainEvoWP() {
    console.log('=== Deleting FAIN EVOLUTIVO WP ===\n');

    // Find FAIN EVOLUTIVO WP
    const evoWp = await prisma.workPackage.findFirst({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' },
            contractType: 'EVOLUTIVO'
        }
    });

    if (!evoWp) {
        console.log('No FAIN EVOLUTIVO WP found');
        await prisma.$disconnect();
        return;
    }

    console.log(`Found: ${evoWp.id} - ${evoWp.name}`);
    console.log('Deleting...');

    await prisma.workPackage.delete({
        where: { id: evoWp.id }
    });

    console.log('✓ Deleted successfully');
    await prisma.$disconnect();
}

deleteFainEvoWP().catch(console.error);
