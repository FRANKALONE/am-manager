const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const now = new Date();
        const allCount = await prisma.workPackage.count();
        const activeCount = await prisma.workPackage.count({
            where: {
                validityPeriods: {
                    some: {
                        startDate: { lte: now },
                        endDate: { gte: now }
                    }
                }
            }
        });
        console.log('Total WP Count:', allCount);
        console.log('Active WP Count:', activeCount);

        if (activeCount === 0) {
            const sampleWP = await prisma.workPackage.findFirst({
                include: { validityPeriods: true }
            });
            console.log('Sample WP:', JSON.stringify(sampleWP, null, 2));
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
