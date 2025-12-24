const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log('Checking and applying migration...\n');

        // Check existing columns
        const result = await prisma.$queryRawUnsafe(`PRAGMA table_info("Regularization");`);
        const existingColumns = result.map(col => col.name);

        console.log('Existing columns:', existingColumns.join(', '));
        console.log('');

        // Add ticketId if not exists
        if (!existingColumns.includes('ticketId')) {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Regularization" ADD COLUMN "ticketId" TEXT;`);
            console.log('✅ Added ticketId column');
        } else {
            console.log('⏭️  ticketId column already exists');
        }

        // Add note if not exists
        if (!existingColumns.includes('note')) {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Regularization" ADD COLUMN "note" TEXT;`);
            console.log('✅ Added note column');
        } else {
            console.log('⏭️  note column already exists');
        }

        // Add updatedAt if not exists
        if (!existingColumns.includes('updatedAt')) {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Regularization" ADD COLUMN "updatedAt" DATETIME;`);
            console.log('✅ Added updatedAt column');

            // Update existing rows
            await prisma.$executeRawUnsafe(`UPDATE "Regularization" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;`);
            console.log('✅ Updated existing rows with updatedAt values');
        } else {
            console.log('⏭️  updatedAt column already exists');
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
