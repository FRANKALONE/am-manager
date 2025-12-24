const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIEWorkPackages() {
    try {
        // Get all WPs for AIE client
        const wps = await prisma.workPackage.findMany({
            where: {
                client: {
                    name: {
                        contains: 'AIE'
                    }
                }
            },
            include: {
                client: true
            }
        });

        console.log(`\n📦 Found ${wps.length} Work Packages for AIE:\n`);

        wps.forEach((wp, index) => {
            console.log(`${index + 1}. WP ID: ${wp.id}`);
            console.log(`   Name: ${wp.name}`);
            console.log(`   Client: ${wp.client.name}`);
            console.log(`   Tempo Account ID: ${wp.tempoAccountId || 'NOT SET'}`);
            console.log(`   Old WP ID: ${wp.oldWpId || 'NOT SET'}`);
            console.log(`   Created: ${wp.createdAt}`);
            console.log('');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAIEWorkPackages();
