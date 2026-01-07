const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClient() {
    const client = await prisma.client.findMany({
        where: {
            name: {
                contains: 'INTRAME'
            }
        },
        select: {
            id: true,
            name: true,
            jiraProjectKey: true
        }
    });

    console.log('Cliente INTRAME:');
    console.log(JSON.stringify(client, null, 2));

    await prisma.$disconnect();
}

checkClient();
