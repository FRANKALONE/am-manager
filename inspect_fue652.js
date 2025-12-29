const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ticketId = 'FUE-652';
    console.log(`Inspecting data for ticket: ${ticketId}`);

    const regularizations = await prisma.regularization.findMany({
        where: { ticketId },
        include: {
            workPackage: {
                select: { name: true }
            }
        }
    });

    console.log('\n--- REGULARIZATIONS ---');
    console.log(JSON.stringify(regularizations, null, 2));

    const worklogs = await prisma.worklogDetail.findMany({
        where: { issueKey: ticketId },
        include: {
            workPackage: {
                select: { name: true }
            }
        }
    });

    console.log('\n--- WORKLOG DETAILS ---');
    console.log(JSON.stringify(worklogs, null, 2));

    // Also check for potential MANUAL- matches if any
    const manualWorklogs = await prisma.worklogDetail.findMany({
        where: {
            tipoImputacion: 'Consumo Manual',
            workPackage: {
                client: {
                    name: { contains: 'Fuerte' }
                }
            }
        },
        include: {
            workPackage: {
                select: { name: true }
            }
        }
    });

    console.log('\n--- MANUAL CONSUMPTIONS FOR FUERTE ---');
    console.log(JSON.stringify(manualWorklogs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
