const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        where: { name: { contains: 'FAIN' } }
    });

    wps.forEach(wp => {
        console.log('--- WP CONFIG ---');
        console.log(`ID: ${wp.id}`);
        console.log(`Name: ${wp.name}`);
        console.log(`Jira Keys: ${wp.jiraProjectKeys}`);
        console.log(`IncludeEvoEstimates: ${wp.includeEvoEstimates}`);
        console.log(`IncludeEvoTM: ${wp.includeEvoTM}`);
        console.log(`Contract Type: ${wp.contractType}`);
        console.log('------------------');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
