
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAzzam() {
    const azzamWpId = 'AZ-AZZAM'; // Guessing the ID, let me find it first
    const wps = await prisma.workPackage.findMany({
        where: { name: { contains: 'AZZAM' } }
    });
    console.log('Found WPs:', wps.map(w => ({ id: w.id, name: w.name })));

    if (wps.length > 0) {
        const wpId = wps[0].id;
        const FebLogs = await prisma.worklogDetail.count({
            where: {
                workPackageId: wpId,
                year: 2024,
                month: 2
            }
        });
        console.log(`Worklogs for February 2024 in ${wpId}: ${FebLogs}`);

        const allLogs = await prisma.worklogDetail.findMany({
            where: { workPackageId: wpId },
            orderBy: { startDate: 'desc' },
            take: 5
        });
        console.log('Latest 5 logs:', allLogs);
    }
}

checkAzzam().catch(console.error).finally(() => prisma.$disconnect());
