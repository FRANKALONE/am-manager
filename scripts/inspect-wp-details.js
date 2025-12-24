const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const wpId = "CSE00081MANT0001.1.1";
    console.log(`Inspecting WP: ${wpId}`);

    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId },
        include: {
            validityPeriods: true,
            monthlyMetrics: { orderBy: { month: 'asc' } }
        }
    });

    if (!wp) {
        console.log("WP Not Found");
        return;
    }

    console.log("--- Header ---");
    console.log(`Total Accumulated Hours (DB): ${wp.accumulatedHours}`);
    console.log(`Contract Type: ${wp.contractType}`);
    console.log(`Jira Project Keys: '${wp.jiraProjectKeys}'`);

    console.log("\n--- Validity Periods ---");
    wp.validityPeriods.forEach(p => {
        console.log(`Start: ${p.startDate.toISOString()}, End: ${p.endDate.toISOString()}`);
    });

    console.log("\n--- Monthly Metrics (DB) ---");
    if (wp.monthlyMetrics.length === 0) console.log("No metrics found.");
    wp.monthlyMetrics.forEach(m => {
        console.log(`Month ${m.month}/${m.year}: ${m.consumedHours}`);
    });
}

run();
