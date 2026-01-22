const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyEvolutivosMigration() {
    try {
        console.log('🚀 Applying Evolutivos Permissions migration...\n');

        const roles = await prisma.role.findMany();

        for (const role of roles) {
            let permissions = {};
            try {
                permissions = JSON.parse(role.permissions);
            } catch (e) {
                console.log(`⚠️  Role ${role.name}: Could not parse permissions, skipping...`);
                continue;
            }

            let updated = false;

            // Step 1: Add view_evolutivos_admin for ADMIN, GERENTE, DIRECTOR
            if (role.name === 'ADMIN' || role.name === 'GERENTE' || role.name === 'DIRECTOR') {
                if (!permissions.view_evolutivos_admin) {
                    permissions.view_evolutivos_admin = true;
                    updated = true;
                }
            }
            // Step 2: Add view_evolutivos_client for CLIENTE
            else if (role.name === 'CLIENTE') {
                if (!permissions.view_evolutivos_client) {
                    permissions.view_evolutivos_client = true;
                    updated = true;
                }
            }

            if (updated) {
                await prisma.role.update({
                    where: { id: role.id },
                    data: { permissions: JSON.stringify(permissions) }
                });
                console.log(`   ✅ Updated ${role.name}: added appropriate evolutivos permission`);
            } else {
                console.log(`   ℹ️  Skipped ${role.name}: permissions already set or not applicable`);
            }
        }

        console.log('\n✅ Migration applied successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

applyEvolutivosMigration();
