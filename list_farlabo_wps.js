// Script to list all FARLABO Work Packages
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listFarlaboWPs() {
    console.log('=== FARLABO Work Packages ===\n');

    const wps = await prisma.workPackage.findMany({
        where: {
            clientName: { contains: 'FARLABO', mode: 'insensitive' }
        },
        orderBy: { name: 'asc' }
    });

    console.log(`Total WPs: ${wps.length}\n`);

    wps.forEach((wp, idx) => {
        console.log(`${idx + 1}. ${wp.name}`);
        console.log(`   ID: ${wp.id}`);
        console.log(`   Type: ${wp.contractType}`);
        console.log(`   Created: ${wp.createdAt}`);
        console.log('');
    });

    await prisma.$disconnect();
}

listFarlaboWPs().catch(console.error);
