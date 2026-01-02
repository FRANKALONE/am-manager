const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00811MANT0001.1.4';
    const year = 2025;
    const month = 5;

    console.log(`Querying worklogs for FAIN (WP: ${wpId}), Month: ${month}/${year}`);

    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wpId,
            year,
            month
        }
    });

    console.log(`Total worklogs found: ${worklogs.length}`);

    const stats = {};
    worklogs.forEach(w => {
        const key = `${w.issueType} | ${w.billingMode}`;
        stats[key] = (stats[key] || 0) + w.timeSpentHours;
    });

    console.log('Stats (Type | BillingMode -> Total Hours):');
    const tableData = Object.entries(stats).map(([k, v]) => ({ TypeBilling: k, Hours: parseFloat(v.toFixed(2)) }));
    console.table(tableData.sort((a, b) => b.Hours - a.Hours));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
