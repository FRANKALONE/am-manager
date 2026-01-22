const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migratePermissions() {
    console.log('Starting analytics permissions migration...');

    const roles = await prisma.role.findMany();

    for (const role of roles) {
        if (!role.permissions) continue;

        let perms;
        try {
            perms = JSON.parse(role.permissions);
        } catch (e) {
            console.error(`Error parsing permissions for role ${role.name}:`, e);
            continue;
        }

        // If they had view_analytics, grant them the existing dashboards
        if (perms.view_analytics === true) {
            console.log(`Migrating permissions for role: ${role.name}`);

            // Add new permissions
            perms.view_analytics_contracts = true;
            perms.view_analytics_wp_consumption = true;

            // Special case: ADMIN also gets the new AM Dashboard
            if (role.name === 'ADMIN') {
                perms.view_analytics_am_dashboard = true;
            }

            // Note: AM Dashboard is new, so we don't automatically grant it to GERENTE/DIRECTOR 
            // unless the user specifically wants them to have it (which we assume they do or 
            // can manage from the new UI). 
            // However, to keep it "equal to before" (where they saw all available analytics), 
            // we might want to grant it.

            // Update the role
            await prisma.role.update({
                where: { id: role.id },
                data: {
                    permissions: JSON.stringify(perms)
                }
            });
        }
    }

    console.log('Migration completed successfully.');
}

migratePermissions()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
