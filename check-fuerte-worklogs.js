const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Count worklogs for Dec 2025
    const logs = await prisma.worklogDetail.findMany({
        where: {
            workPackageId: 'AMA30313MANT0001.1.2',
            year: 2025,
            month: 12
        },
        orderBy: { startDate: 'asc' }
    });

    console.log(`Total worklogs for Dec 2025: ${logs.length}`);
    console.log('\nWorklog details:');
    logs.forEach(log => {
        console.log(`  - ${log.startDate.toISOString().split('T')[0]}: ${log.timeSpentHours.toFixed(2)}h on ${log.issueKey} | ${log.author}`);
    });

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
