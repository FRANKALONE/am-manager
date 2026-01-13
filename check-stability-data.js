
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const wp = await prisma.workPackage.findFirst({
            where: { id: 'AMA00019MANT0001.1.1' } // APARICI
        });

        if (!wp) {
            console.log("WP FAI not found");
            return;
        }

        const tickets = await prisma.ticket.findMany({
            where: { workPackageId: wp.id }
        });

        console.log(`Total tickets for ${wp.id}: ${tickets.length}`);

        // Simulate sortedMonths logic from dashboard.ts
        const months = [...new Set(tickets.map(t => {
            const d = new Date(t.createdDate);
            return `${d.getMonth() + 1}/${d.getFullYear()}`;
        }))];

        // Sort months (simplified)
        const sortedMonths = months.sort((a, b) => {
            const [ma, ya] = a.split('/').map(Number);
            const [mb, yb] = b.split('/').map(Number);
            return ya !== yb ? ya - yb : ma - mb;
        });

        console.log("Sorted Months:", sortedMonths);

        const stabilityTrend = sortedMonths.map(m => {
            const monthTickets = tickets.filter(t => {
                const d = new Date(t.createdDate);
                return `${d.getMonth() + 1}/${d.getFullYear()}` === m;
            });
            const correctiveCount = monthTickets.filter(t =>
                (t.issueType || '').includes('Incidencia') ||
                (t.issueType || '').includes('Correctivo')
            ).length;
            const total = monthTickets.length || 1;
            return {
                month: m,
                correctiveCount,
                total,
                correctivePct: (correctiveCount / total) * 100
            };
        });

        console.log("Stability Trend Data:");
        console.table(stabilityTrend);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
