const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDecemberAIE() {
    try {
        // 1. Find all EXCESS regularizations in December 2025
        const results = await prisma.regularization.findMany({
            where: {
                type: 'EXCESS',
                date: {
                    gte: new Date(2025, 11, 1),
                    lt: new Date(2026, 0, 1)
                }
            },
            include: {
                workPackage: {
                    include: {
                        client: true
                    }
                }
            }
        });

        console.log(`\n📋 Found ${results.length} EXCESS regularizations in December 2025:\n`);

        results.forEach((r, index) => {
            console.log(`${index + 1}. ID: ${r.id}`);
            console.log(`   WP: ${r.workPackage.name}`);
            console.log(`   Client: ${r.workPackage.client.name}`);
            console.log(`   Quantity: ${r.quantity}`);
            console.log(`   Current: isRevenueRecognized=${r.isRevenueRecognized}, isBilled=${r.isBilled}`);
            console.log('');
        });

        // 2. Update them to be Revenue Recognized but NOT Billed
        const updateResult = await prisma.regularization.updateMany({
            where: {
                type: 'EXCESS',
                date: {
                    gte: new Date(2025, 11, 1),
                    lt: new Date(2026, 0, 1)
                }
            },
            data: {
                isRevenueRecognized: true,
                isBilled: false
            }
        });

        console.log(`\n✅ Updated ${updateResult.count} regularizations\n`);

        // 3. Verify the changes
        const verifyResults = await prisma.regularization.findMany({
            where: {
                type: 'EXCESS',
                date: {
                    gte: new Date(2025, 11, 1),
                    lt: new Date(2026, 0, 1)
                }
            },
            include: {
                workPackage: {
                    include: {
                        client: true
                    }
                }
            }
        });

        console.log(`📋 Verification - After update:\n`);

        verifyResults.forEach((r, index) => {
            console.log(`${index + 1}. ID: ${r.id}`);
            console.log(`   WP: ${r.workPackage.name}`);
            console.log(`   Client: ${r.workPackage.client.name}`);
            console.log(`   Updated: isRevenueRecognized=${r.isRevenueRecognized}, isBilled=${r.isBilled}`);
            console.log('');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

fixDecemberAIE();
