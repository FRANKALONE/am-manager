const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRegularizations() {
    try {
        // Find Europesnacks WP
        const wp = await prisma.workPackage.findFirst({
            where: {
                client: {
                    name: {
                        contains: 'Europesnacks'
                    }
                }
            },
            include: {
                regularizations: {
                    orderBy: { date: 'asc' }
                },
                client: true
            }
        });

        if (!wp) {
            console.log('No WP found for Europesnacks');
            return;
        }

        console.log(`\n📦 WP: ${wp.id} - ${wp.name}`);
        console.log(`Client: ${wp.client.name}\n`);

        console.log(`📋 Regularizations: ${wp.regularizations.length}\n`);

        wp.regularizations.forEach((reg, index) => {
            console.log(`${index + 1}. Date: ${reg.date}`);
            console.log(`   Type: ${reg.type}`);
            console.log(`   Quantity: ${reg.quantity} hours`);
            console.log(`   Description: ${reg.description || 'N/A'}`);
            console.log('');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkRegularizations();
