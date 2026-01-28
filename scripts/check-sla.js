const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlaData() {
    const samples = await prisma.ticket.findMany({
        where: {
            OR: [
                { slaResponse: { not: null } },
                { slaResolution: { not: null } }
            ]
        },
        select: {
            issueKey: true,
            issueType: true,
            slaResponse: true,
            slaResponseTime: true,
            slaResolution: true,
            slaResolutionTime: true
        },
        take: 10
    });

    console.log('SLA Data Samples:');
    console.log(JSON.stringify(samples, null, 2));

    const counts = await prisma.ticket.groupBy({
        by: ['slaResponse'],
        _count: { _all: true }
    });
    console.log('SLA Response Status counts:', counts);

    await prisma.$disconnect();
}

checkSlaData().catch(console.error);
