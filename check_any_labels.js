const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const month = 9;
    const year = 2025;

    const logs = await prisma.worklogDetail.findMany({
        where: {
            month,
            year
        },
        take: 10
    });

    console.log('--- SAMPLED WORKLOG DETAILS ---');
    logs.forEach(l => {
        console.log(`WP ID: ${l.workPackageId}, Key: ${l.issueKey}, BillingMode: ${l.billingMode}`);
    });

    if (logs.length === 0) {
        console.log('No logs found for month 9 year 2025');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
