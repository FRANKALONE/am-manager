const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    const wpId = 'AMA00263MANT0001.1.1';
    console.log(`\n=== Audit for WP: ${wpId} ===`);

    // 1. Get WP and its Correction Model
    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId },
        include: {
            wpCorrections: { include: { correctionModel: true } }
        }
    });
    console.log('Correction Models:', JSON.stringify(wp.wpCorrections, null, 2));

    // 2. Metrics vs Details for December 2025
    const month = 12;
    const year = 2025;
    const metric = await prisma.monthlyMetric.findFirst({
        where: { workPackageId: wpId, year, month }
    });
    const details = await prisma.worklogDetail.findMany({
        where: { workPackageId: wpId, year, month }
    });

    console.log(`\nMonth: ${month}/${year}`);
    console.log(`Metric Value: ${metric?.consumedHours || 0}h`);
    console.log(`Details Sum: ${details.reduce((s, d) => s + d.timeSpentHours, 0)}h`);
    console.log(`Details Count: ${details.length}`);

    // Break down by author
    const breakdown = details.reduce((acc, d) => {
        acc[d.author] = (acc[d.author] || 0) + d.timeSpentHours;
        return acc;
    }, {});
    console.log('Breakdown by Author:', breakdown);

    // 3. Find missing hours in Ticket table
    const tickets = await prisma.ticket.findMany({
        where: { workPackageId: wpId, year, month }
    });
    console.log(`\nTickets found in DB for this period: ${tickets.length}`);
    tickets.sort((a, b) => b.issueKey > a.issueKey ? -1 : 1).forEach(t => {
        console.log(`- ${t.issueKey}: ${t.issueSummary} | Mode: ${t.billingMode} | Status: ${t.status}`);
    });

    // 4. Specifically look for Evolutivos with estimates that might be causing this
    // We can't see Jira estimates directly here if they weren't saved to WorklogDetail, 
    // but we can check if there are many tickets.

    // 5. Check if some WorklogDetails were saved with DIFFERENT date but counted in monthlyHours
    // This would happen if evo.year/month was used for monthlyHours but something else for worklogDetail
}

diagnose()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
