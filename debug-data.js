
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Checking JIRA User Requests ---");
        const requests = await prisma.jiraUserRequest.findMany({
            include: {
                requestedByUser: true,
                client: true
            }
        });
        console.log(`Total requests found: ${requests.length}`);
        requests.forEach(r => {
            console.log(`ID: ${r.id}, Status: ${r.status}, Client: ${r.client?.name}, RequestedBy: ${r.requestedByUser?.email}`);
        });

        console.log("\n--- Checking Notifications ---");
        const notifications = await prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log(`Recent notifications count: ${notifications.length}`);
        notifications.forEach(n => {
            console.log(`To UserID: ${n.userId}, Type: ${n.type}, Title: ${n.title}, Message: ${n.message}`);
        });

        console.log("\n--- Checking Notification Settings ---");
        const settings = await prisma.notificationSetting.findMany();
        console.log(`Settings count: ${settings.length}`);
        settings.filter(s => s.type.includes('JIRA')).forEach(s => {
            console.log(`Type: ${s.type}, Enabled: ${s.isEnabled}`);
        });

    } catch (error) {
        console.error("Debug script error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
