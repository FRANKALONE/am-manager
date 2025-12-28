const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        include: { client: true }
    });

    wps.forEach(wp => {
        console.log(`ID: ${wp.id}, Name: ${wp.name}, Client: ${wp.client.name}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
