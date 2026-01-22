const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumn() {
    try {
        await prisma.$executeRawUnsafe(
            'ALTER TABLE WorkPackage ADD COLUMN hasIaasService INTEGER NOT NULL DEFAULT 0'
        );
        console.log('✅ Column hasIaasService added successfully');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('✅ Column hasIaasService already exists');
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

addColumn();
