
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listWps() {
    try {
        const wps = await prisma.workPackage.findMany({
            take: 5,
            select: { id: true, name: true }
        });
        console.log("Available WPs:");
        console.table(wps);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
listWps();
