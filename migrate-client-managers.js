const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping of initials to User IDs
const mapping = {
    "PS": "paco-user-1766417468729", // PACO SOLA
    "XS": "0e939ae9-63e9-4c84-be56-95218216ad96", // XOANA SANCHEZ
    // Add more mappings here as users are created
};

async function migrate() {
    console.log('--- Starting Client Manager Migration ---');
    try {
        const clients = await prisma.client.findMany({
            select: { id: true, name: true, manager: true }
        });

        let updatedCount = 0;
        let pendingCount = 0;

        for (const client of clients) {
            if (!client.manager) continue;

            const targetUserId = mapping[client.manager];

            if (targetUserId) {
                await prisma.client.update({
                    where: { id: client.id },
                    data: { manager: targetUserId }
                });
                console.log(`[OK] Updated ${client.name}: ${client.manager} -> ${targetUserId}`);
                updatedCount++;
            } else {
                // If it's already a UUID or we don't know it
                if (client.manager.length > 5) {
                    console.log(`[SKIP] Client ${client.name} already has a long manager ID: ${client.manager}`);
                } else {
                    console.log(`[PENDING] Could not map manager "${client.manager}" for client ${client.name}`);
                    pendingCount++;
                }
            }
        }

        console.log(`\nMigration Summary:`);
        console.log(`- Updated: ${updatedCount}`);
        console.log(`- Pending (manual update needed): ${pendingCount}`);

        await prisma.$disconnect();
    } catch (e) {
        console.error('Migration failed:', e);
        await prisma.$disconnect();
    }
}

migrate();
