
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTypesForAparici() {
    try {
        const types = await prisma.ticket.groupBy({
            where: { workPackageId: 'AMA00019MANT0001.1.1' },
            by: ['issueType'],
            _count: { issueType: true }
        });
        console.log("Issue Types for APARICI:");
        console.table(types);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
checkTypesForAparici();
