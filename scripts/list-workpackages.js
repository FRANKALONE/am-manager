const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listWorkPackages() {
    try {
        const wps = await prisma.workPackage.findMany({
            select: {
                id: true,
                name: true,
                tempoAccountId: true
            }
        });

        console.log(`\n=== Work Packages in Database ===\n`);
        wps.forEach(wp => {
            console.log(`ID: ${wp.id}`);
            console.log(`Name: ${wp.name}`);
            console.log(`Tempo Account ID: ${wp.tempoAccountId || 'NOT SET'}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listWorkPackages();
