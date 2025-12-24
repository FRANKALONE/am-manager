const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany({ select: { id: true, name: true } });
    console.log("Clients:", clients);
}

main().finally(() => prisma.$disconnect());
