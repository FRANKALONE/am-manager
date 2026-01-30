const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const members = await prisma.teamMember.findMany({
        include: { assignments: true, team: true }
    });
    console.log(JSON.stringify(members.slice(0, 5), null, 2));
}

main();
