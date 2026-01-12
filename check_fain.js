const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFain() {
    try {
        console.log('=== FAIN Work Packages ===');
        const wps = await prisma.workPackage.findMany({
            where: {
                name: {
                    contains: 'FAIN'
                }
            },
            select: {
                id: true,
                name: true,
                contractType: true,
                jiraProjectKeys: true,
                includeEvoEstimates: true,
                includeEvoTM: true,
                lastSyncedAt: true
            }
        });

        console.log(JSON.stringify(wps, null, 2));

        if (wps.length > 0) {
            const wpId = wps[0].id;
            console.log(`\n=== WorklogDetails for ${wps[0].name} (December 2024, Evolutivos) ===`);

            const worklogs = await prisma.worklogDetail.findMany({
                where: {
                    workPackageId: wpId,
                    year: 2024,
                    month: 12,
                    issueType: 'Evolutivo'
                },
                select: {
                    issueKey: true,
                    issueSummary: true,
                    timeSpentHours: true,
                    billingMode: true,
                    author: true,
                    tipoImputacion: true,
                    issueCreatedDate: true
                },
                orderBy: {
                    issueKey: 'asc'
                }
            });

            console.log(`Found ${worklogs.length} Evolutivo worklogs in December 2024`);
            console.log(JSON.stringify(worklogs, null, 2));

            console.log(`\n=== MonthlyMetrics for ${wps[0].name} (2024) ===`);
            const metrics = await prisma.monthlyMetric.findMany({
                where: {
                    workPackageId: wpId,
                    year: 2024
                },
                select: {
                    year: true,
                    month: true,
                    consumedHours: true
                },
                orderBy: [
                    { year: 'asc' },
                    { month: 'asc' }
                ]
            });

            console.log(JSON.stringify(metrics, null, 2));

            // Check for FAI-517 specifically
            console.log(`\n=== Checking for FAI-517 specifically ===`);
            const fai517 = await prisma.worklogDetail.findMany({
                where: {
                    workPackageId: wpId,
                    issueKey: 'FAI-517'
                },
                select: {
                    year: true,
                    month: true,
                    issueKey: true,
                    issueSummary: true,
                    timeSpentHours: true,
                    billingMode: true,
                    author: true,
                    tipoImputacion: true,
                    issueCreatedDate: true
                },
                orderBy: [
                    { year: 'asc' },
                    { month: 'asc' }
                ]
            });

            console.log(`Found ${fai517.length} records for FAI-517`);
            console.log(JSON.stringify(fai517, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFain();
