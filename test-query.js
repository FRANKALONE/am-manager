const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const wps = await prisma.workPackage.findMany({
            where: {
                validityPeriods: {
                    some: {
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    }
                }
            },
            include: {
                _count: {
                    select: { validityPeriods: true }
                },
                validityPeriods: true
            }
        });
        console.log('Active WPs count:', wps.length);
        if (wps.length > 0) {
            console.log('Sample WP name:', wps[0].name);
            console.log('Sample WP validityPeriods count:', wps[0].validityPeriods.length);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
