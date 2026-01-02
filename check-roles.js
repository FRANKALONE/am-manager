const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
    try {
        const users = await prisma.user.findMany({
            select: { role: true }
        });
        const roles = Array.from(new Set(users.map(u => u.role)));
        console.log('Unique roles in User table:', roles);

        const allUsers = await prisma.user.findMany({
            select: { id: true, name: true, role: true }
        });
        console.log('All Users:', JSON.stringify(allUsers, null, 2));

        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
        await prisma.$disconnect();
    }
}
checkRoles();
