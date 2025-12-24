const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = "CSE00081MANT0001.1.1";
    const metrics = await prisma.monthlyMetric.findMany({
        where: { workPackageId: wpId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });
    console.log("Found Metrics Count:", metrics.length);
    console.log("Metrics:", JSON.stringify(metrics, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
