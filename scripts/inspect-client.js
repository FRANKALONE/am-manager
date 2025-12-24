const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const wpId = "CSE00081MANT0001.1.1";
    console.log(`Inspecting Client for WP: ${wpId}`);

    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId },
        include: { client: true } // Fetch client
    });

    if (!wp) {
        console.log("WP Not Found");
        return;
    }

    console.log("WP ID:", wp.id);
    console.log("Client ID:", wp.clientId);
    console.log("Client Name:", wp.client.name);
    console.log("Client Custom Attributes:", wp.client.customAttributes);
    console.log("WP Custom Attributes:", wp.customAttributes);
}

run();
