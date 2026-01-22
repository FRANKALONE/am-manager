const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding column...');
        const res = await prisma.$executeRawUnsafe('ALTER TABLE "ValidityPeriod" ADD COLUMN IF NOT EXISTS "billingType" TEXT');
        console.log('Result:', res);

        console.log('Migrating data...');
        const migrateRes = await prisma.$executeRawUnsafe(`
      UPDATE "ValidityPeriod" vp
      SET "billingType" = wp."billingType"
      FROM "WorkPackage" wp
      WHERE vp."workPackageId" = wp.id
      AND vp."billingType" IS NULL
    `);
        console.log('Migration Result:', migrateRes);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
