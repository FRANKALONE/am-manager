const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00139MANT0001.1.1';
    const year = 2025;
    const month = 11;
    const excludedModes = ['T&M facturable', 'T&M Facturable', 'Facturable', 'facturable'];

    console.log(`Testing refined filtering for WP: ${wpId}, Month: ${month}/${year}`);

    const worklogs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: wpId,
            year,
            month,
            NOT: {
                AND: [
                    { issueType: 'Evolutivo' },
                    { billingMode: { in: excludedModes } }
                ]
            }
        }
    });

    console.log(`Worklogs found with refined filter: ${worklogs.length}`);

    const typesFound = Array.from(new Set(worklogs.map(w => w.issueType)));
    console.log(`Types found: ${typesFound.join(', ')}`);

    const stats = {};
    worklogs.forEach(w => {
        const key = `${w.issueType} | ${w.billingMode}`;
        stats[key] = (stats[key] || 0) + 1;
    });
    console.table(stats);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
