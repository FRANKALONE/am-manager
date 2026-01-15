const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const wps = await prisma.workPackage.findMany({
            include: {
                validityPeriods: true,
                client: {
                    select: { name: true }
                }
            },
            take: 20
        });
        console.log(JSON.stringify(wps, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
