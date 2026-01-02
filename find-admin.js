const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            take: 5
        });
        console.log('Admins found:', admins.map(u => ({ email: u.email, id: u.id })));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
