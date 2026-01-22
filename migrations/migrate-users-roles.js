const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateUserAndRole() {
    try {
        // Add new columns to User table
        await prisma.$executeRawUnsafe(
            'ALTER TABLE User ADD COLUMN workPackageIds TEXT'
        );
        console.log('✅ Added workPackageIds column to User');

        await prisma.$executeRawUnsafe(
            'ALTER TABLE User ADD COLUMN lastLoginAt DATETIME'
        );
        console.log('✅ Added lastLoginAt column to User');

        // Create Role table
        await prisma.$executeRawUnsafe(`
            CREATE TABLE Role (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                permissions TEXT NOT NULL,
                isActive INTEGER NOT NULL DEFAULT 1,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created Role table');

        // Insert ADMIN role
        const adminRoleId = 'admin-role-' + Date.now();
        await prisma.$executeRawUnsafe(`
            INSERT INTO Role (id, name, description, permissions, isActive, createdAt, updatedAt)
            VALUES (?, 'ADMIN', 'Administrador con acceso completo', '{"all": true}', 1, datetime('now'), datetime('now'))
        `, adminRoleId);
        console.log('✅ Created ADMIN role');

        // Insert Paco user
        const pacoUserId = 'paco-user-' + Date.now();
        await prisma.$executeRawUnsafe(`
            INSERT INTO User (id, name, surname, email, password, role, clientId, workPackageIds, lastLoginAt, createdAt, updatedAt)
            VALUES (?, 'Paco', 'Sola', 'psola@altim.es', 'Altim2025!', 'ADMIN', NULL, NULL, NULL, datetime('now'), datetime('now'))
        `, pacoUserId);
        console.log('✅ Created Paco user (psola@altim.es)');

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  Columns already exist, skipping...');
        } else if (error.message.includes('already exists')) {
            console.log('⚠️  Table/data already exists, skipping...');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

migrateUserAndRole();
