// Script to check where FAI-411 manual consumption was saved
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFai411Manual() {
    console.log('=== Checking FAI-411 Manual Consumption ===\n');

    // Find all regularizations for FAI-411
    const regs = await prisma.regularization.findMany({
        where: {
            ticketId: 'FAI-411'
        },
        include: {
            workPackage: true
        }
    });

    console.log(`Total regularizations for FAI-411: ${regs.length}\n`);

    regs.forEach(r => {
        const d = new Date(r.date);
        console.log(`ID: ${r.id}`);
        console.log(`Type: ${r.type}`);
        console.log(`Date: ${d.toLocaleDateString('es-ES')}`);
        console.log(`Quantity: ${r.quantity}h`);
        console.log(`WP ID: ${r.workPackageId}`);
        console.log(`WP Name: ${r.workPackage.name}`);
        console.log(`Description: ${r.description}`);
        console.log('---');
    });

    // Check all FAIN WPs
    const fainWps = await prisma.workPackage.findMany({
        where: {
            clientName: { contains: 'FAIN', mode: 'insensitive' }
        }
    });

    console.log(`\nAll FAIN WPs: ${fainWps.length}`);
    fainWps.forEach(wp => {
        console.log(`  ${wp.id}: ${wp.name} (${wp.contractType})`);
    });

    await prisma.$disconnect();
}

checkFai411Manual().catch(console.error);
