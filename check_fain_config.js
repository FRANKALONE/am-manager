const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wpId = 'AMA00811MANT0001.1.4';
    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId }
    });

    console.log('--- FAIN WP CONFIG ---');
    console.log(`ID: ${wp.id}`);
    console.log(`Name: ${wp.name}`);
    console.log(`JiraProjectKeys: ${wp.jiraProjectKeys}`);
    console.log(`IncludeEvoEstimates: ${wp.includeEvoEstimates}`);
    console.log(`IncludeEvoTM: ${wp.includeEvoTM}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
