const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContractType() {
    const wp = await prisma.workPackage.findFirst({
        where: {
            name: {
                contains: 'IMPREX'
            }
        }
    });

    if (wp) {
        console.log('WP Name:', wp.name);
        console.log('Contract Type:', wp.contractType);
        console.log('Contract Type (uppercase):', wp.contractType?.toUpperCase());
        console.log('Is EVENTOS?:', wp.contractType?.toUpperCase() === 'EVENTOS');
    } else {
        console.log('WP not found');
    }

    await prisma.$disconnect();
}

checkContractType().catch(console.error);
