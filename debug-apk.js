const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const client = await prisma.client.findFirst({
        where: { name: { contains: 'APK', mode: 'insensitive' } },
        include: {
            workPackages: {
                include: {
                    validityPeriods: true,
                    wpCorrections: { include: { correctionModel: true } }
                }
            }
        }
    });

    console.log(JSON.stringify(client, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
