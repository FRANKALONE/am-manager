const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const wps = await prisma.workPackage.findMany({
            include: { validityPeriods: true },
            take: 10
        });
        wps.forEach(wp => {
            console.log(`WP: ${wp.name}`);
            console.log(`  WP billingType: ${wp.billingType}`);
            wp.validityPeriods.forEach(vp => {
                console.log(`    VP (id: ${vp.id}) billingType: ${vp.billingType}`);
            });
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
