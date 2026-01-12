const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rolesToUpdate = ['ADMIN', 'GERENTE'];

    for (const roleName of rolesToUpdate) {
        const role = await prisma.role.findUnique({
            where: { name: roleName }
        });

        if (role) {
            try {
                const permissions = JSON.parse(role.permissions);
                permissions.view_service_intelligence = true;

                await prisma.role.update({
                    where: { id: role.id },
                    data: {
                        permissions: JSON.stringify(permissions)
                    }
                });
                console.log(`Updated permissions for role: ${roleName}`);
            } catch (e) {
                console.error(`Error updating role ${roleName}:`, e);
            }
        } else {
            console.log(`Role not found: ${roleName}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
