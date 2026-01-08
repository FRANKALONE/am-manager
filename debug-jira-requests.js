
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking database...");

        // Check for a sample client and user
        const user = await prisma.user.findFirst({
            where: { role: 'CLIENTE' },
            include: { client: true }
        });

        if (!user) {
            console.log("No CLIENTE user found.");
            return;
        }

        console.log(`Found CLIENTE user: ${user.email} (ID: ${user.id})`);
        console.log(`Associated Client: ${user.client?.name} (ID: ${user.clientId})`);

        if (!user.clientId) {
            console.log("CRITICAL: User has no clientId!");
        }

        // Try to simulate the create call (dry run if possible, but prisma.create is not dry run)
        // We'll just check if the client exists in the Client table
        const client = await prisma.client.findUnique({
            where: { id: user.clientId || '' }
        });

        if (!client) {
            console.log(`CRITICAL: Client with ID ${user.clientId} DOES NOT EXIST in Client table!`);
        } else {
            console.log(`Client ${user.clientId} exists.`);
        }

        // Check JiraUserRequest model
        const count = await prisma.jiraUserRequest.count();
        console.log(`Current JiraUserRequest count: ${count}`);

    } catch (error) {
        console.error("Debug script error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
