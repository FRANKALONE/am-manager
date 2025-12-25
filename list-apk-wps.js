const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const wps = await prisma.workPackage.findMany({
        where: {
            OR: [
                { id: { contains: '00065' } },
                { name: { contains: 'APK' } }
            ]
        },
        include: {
            validityPeriods: true
        }
    });
    console.log(JSON.stringify(wps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
