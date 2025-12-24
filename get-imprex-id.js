const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getIMPREXWPId() {
    const wp = await prisma.workPackage.findFirst({
        where: {
            name: {
                contains: 'IMPREX'
            }
        }
    });

    if (wp) {
        console.log('WP ID:', wp.id);
        console.log('WP Name:', wp.name);
        console.log('Contract Type:', wp.contractType);
    } else {
        console.log('WP not found');
    }

    await prisma.$disconnect();
}

getIMPREXWPId().catch(console.error);
