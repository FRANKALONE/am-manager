const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRolePremiumAndPermissions() {
    try {
        console.log('🚀 Starting migration: Add isPremium to Role and update dashboard permissions...\n');

        // Step 1: Add isPremium column to Role table
        await prisma.$executeRawUnsafe(
            'ALTER TABLE Role ADD COLUMN isPremium INTEGER NOT NULL DEFAULT 0'
        );
        console.log('✅ Added isPremium column to Role table');

        // Step 2: Get all existing roles
        const roles = await prisma.role.findMany();
        console.log(`📋 Found ${roles.length} roles to migrate\n`);

        // Step 3: Update each role
        for (const role of roles) {
            let permissions = {};
            try {
                permissions = JSON.parse(role.permissions);
            } catch (e) {
                console.log(`⚠️  Role ${role.name}: Could not parse permissions, skipping...`);
                continue;
            }

            let updated = false;
            let madeChanges = [];

            // Check if role has view_dashboard permission
            const hasViewDashboard = permissions.view_dashboard === true;

            if (hasViewDashboard) {
                // Remove old permission
                delete permissions.view_dashboard;

                // Add new specific permissions based on role name
                if (role.name === 'ADMIN') {
                    permissions.view_admin_dashboard = true;
                    madeChanges.push('Added view_admin_dashboard');
                } else if (role.name === 'GERENTE' || role.name === 'DIRECTOR') {
                    permissions.view_manager_dashboard = true;
                    madeChanges.push('Added view_manager_dashboard');
                } else {
                    // Default to client dashboard for other roles
                    permissions.view_client_dashboard = true;
                    madeChanges.push('Added view_client_dashboard');
                }

                madeChanges.push('Removed view_dashboard');
                updated = true;
            }

            // Determine if role should be premium
            let isPremium = 0;
            if (role.name === 'ADMIN' || role.name === 'GERENTE' || role.name === 'DIRECTOR') {
                isPremium = 1;
                madeChanges.push('Set as Premium');
                updated = true;
            }

            // Update role if changes were made
            if (updated) {
                await prisma.role.update({
                    where: { id: role.id },
                    data: {
                        permissions: JSON.stringify(permissions),
                        isPremium: isPremium
                    }
                });
                console.log(`✅ Role "${role.name}": ${madeChanges.join(', ')}`);
            } else {
                console.log(`⏭️  Role "${role.name}": No changes needed`);
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📌 Summary:');
        console.log('   - Added isPremium column to Role table');
        console.log('   - Migrated view_dashboard to specific dashboard permissions');
        console.log('   - Set ADMIN, GERENTE, and DIRECTOR roles as Premium');

    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('⚠️  Column isPremium already exists, continuing with permission migration...');

            // Even if column exists, try to update permissions
            try {
                const roles = await prisma.role.findMany();
                for (const role of roles) {
                    let permissions = {};
                    try {
                        permissions = JSON.parse(role.permissions);
                    } catch (e) {
                        continue;
                    }

                    const hasViewDashboard = permissions.view_dashboard === true;
                    if (hasViewDashboard) {
                        delete permissions.view_dashboard;
                        if (role.name === 'ADMIN') {
                            permissions.view_admin_dashboard = true;
                        } else if (role.name === 'GERENTE' || role.name === 'DIRECTOR') {
                            permissions.view_manager_dashboard = true;
                        } else {
                            permissions.view_client_dashboard = true;
                        }

                        await prisma.role.update({
                            where: { id: role.id },
                            data: { permissions: JSON.stringify(permissions) }
                        });
                        console.log(`✅ Updated permissions for role "${role.name}"`);
                    }
                }
            } catch (permError) {
                console.error('❌ Error updating permissions:', permError.message);
            }
        } else {
            console.error('❌ Migration error:', error.message);
            throw error;
        }
    } finally {
        await prisma.$disconnect();
    }
}

migrateRolePremiumAndPermissions();
