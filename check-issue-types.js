
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTypes() {
    try {
        const types = await prisma.ticket.groupBy({
            by: ['issueType'],
            _count: { issueType: true }
        });
        console.log("Issue Types in DB:");
        console.table(types);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
checkTypes();
