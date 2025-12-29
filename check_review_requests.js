const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const requests = await prisma.reviewRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
            workPackage: { select: { name: true } }
        }
    });

    console.log(`Found ${requests.length} pending requests.`);

    for (const req of requests) {
        console.log(`\nRequest ID: ${req.id}`);
        console.log(`WP: ${req.workPackage.name}`);
        console.log(`Created At: ${req.createdAt}`);
        console.log(`Reason: ${req.reason}`);

        const worklogIds = JSON.parse(req.worklogIds);
        console.log(`Worklog IDs stored: ${JSON.stringify(worklogIds)}`);

        const worklogs = await prisma.worklogDetail.findMany({
            where: { id: { in: worklogIds } }
        });

        console.log(`Worklogs found in DB: ${worklogs.length}`);
        if (worklogs.length > 0) {
            console.log('Sample worklogs:', JSON.stringify(worklogs.slice(0, 2), null, 2));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
