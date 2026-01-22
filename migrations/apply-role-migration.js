const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
    try {
        console.log('🚀 Applying Role Premium migration...\n');

        // Step 1: Add isPremium column
        console.log('📝 Adding isPremium column...');
        await prisma.$executeRaw`ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "isPremium" INTEGER NOT NULL DEFAULT 0`;
        console.log('✅ Column added');

        // Step 2: Update existing premium roles
        console.log('\n📝 Setting premium roles...');
        await prisma.$executeRaw`UPDATE "Role" SET "isPremium" = 1 WHERE "name" IN ('ADMIN', 'GERENTE', 'DIRECTOR')`;
        console.log('✅ Premium roles updated');

        // Step 3: Get all roles and update permissions
        console.log('\n📝 Updating dashboard permissions...');
        const roles = await prisma.role.findMany();

        for (const role of roles) {
            let permissions = {};
            try {
                permissions = JSON.parse(role.permissions);
            } catch (e) {
                console.log(`⚠️  Role ${role.name}: Could not parse permissions, skipping...`);
                continue;
            }

            if (permissions.view_dashboard === true) {
                // Remove old permission
                delete permissions.view_dashboard;

                // Add new specific permission
                if (role.name === 'ADMIN') {
                    permissions.view_admin_dashboard = true;
                } else if (role.name === 'GERENTE' || role.name === 'DIRECTOR') {
                    permissions.view_manager_dashboard = true;
                } else {
                    permissions.view_client_dashboard = true;
                }

                // Update the role
                await prisma.role.update({
                    where: { id: role.id },
                    data: { permissions: JSON.stringify(permissions) }
                });

                console.log(`   ✅ Updated ${role.name}: removed view_dashboard, added specific dashboard permission`);
            }
        }

        console.log('\n✅ Migration applied successfully!');
        console.log('\n📌 Summary:');
        console.log('   - Added isPremium column to Role table');
        console.log('   - Set ADMIN, GERENTE, DIRECTOR as premium roles');
        console.log('   - Migrated view_dashboard permissions to specific dashboard permissions');

        // Verify the changes
        const updatedRoles = await prisma.role.findMany();
        console.log('\n📋 Current roles:');
        for (const role of updatedRoles) {
            const permissions = JSON.parse(role.permissions);
            const dashboardPerms = Object.keys(permissions).filter(k => k.includes('dashboard')).join(', ');
            console.log(`   - ${role.name}: isPremium=${role.isPremium}, dashboards=[${dashboardPerms}]`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

applyMigration();
