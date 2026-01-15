const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function stopSync() {
    const SYNC_JOB_KEY = "BULK_SYNC_STATUS";
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SYNC_JOB_KEY }
        });

        if (!setting) {
            console.log("No sync status found.");
            return;
        }

        const value = JSON.parse(setting.value);
        value.isSyncing = false;
        value.lastUpdate = Date.now();

        await prisma.systemSetting.update({
            where: { key: SYNC_JOB_KEY },
            data: { value: JSON.stringify(value) }
        });

        console.log("Sync stopped successfully.");
    } catch (error) {
        console.error("Error stopping sync:", error);
    } finally {
        await prisma.$disconnect();
    }
}

stopSync();
