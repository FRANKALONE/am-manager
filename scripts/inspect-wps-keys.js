const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        take: 20,
        select: {
            id: true,
            name: true,
            jiraProjectKeys: true, // Added
            totalQuantity: true
        }
    });

    console.log("Checking first 20 WPs for Jira Keys...");
    wps.forEach(wp => {
        console.log(`[${wp.id}] Keys: "${wp.jiraProjectKeys || 'NULL'}"`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
