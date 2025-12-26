const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Adding BAJO_PEDIDO parameter...');
    try {
        const category = 'REGULARIZATION_TYPE';
        const label = 'Bajo Pedido';
        const value = 'BAJO_PEDIDO';

        // Check if already exists
        const exists = await prisma.parameter.findFirst({
            where: { category, value }
        });

        if (exists) {
            console.log('Parameter already exists.');
            return;
        }

        // Get max order
        const lastParam = await prisma.parameter.findFirst({
            where: { category },
            orderBy: { order: 'desc' }
        });
        const nextOrder = (lastParam?.order || 0) + 1;

        await prisma.parameter.create({
            data: {
                category,
                label,
                value,
                order: nextOrder,
            },
        });

        console.log('Parameter BAJO_PEDIDO added successfully.');
    } catch (error) {
        console.error('Error adding parameter:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
