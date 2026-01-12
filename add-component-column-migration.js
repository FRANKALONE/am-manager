const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log('Checking and applying migration for Ticket component column (PostgreSQL)...\n');

        // Check existing columns using information_schema
        const result = await prisma.$queryRawUnsafe(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Ticket' AND column_name = 'component';
        `);

        console.log('Column check result:', result);

        // Add component if not exists
        if (result.length === 0) {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Ticket" ADD COLUMN "component" TEXT;`);
            console.log('✅ Added component column to Ticket table');
        } else {
            console.log('⏭️  component column already exists in Ticket table');
        }

        console.log('\n✅ Migration completed successfully!');

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

migrate();
