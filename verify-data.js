const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const wps = await prisma.workPackage.findMany({
            include: {
                validityPeriods: true
            }
        });
        console.log('Found WPs:', wps.length);
        if (wps.length > 0) {
            console.log('First WP Name:', wps[0].name);
            console.log('First WP billingType (WP):', wps[0].billingType);
            console.log('First WP ValidityPeriods count:', wps[0].validityPeriods.length);
            console.log('First VP billingType:', wps[0].validityPeriods[0]?.billingType);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
