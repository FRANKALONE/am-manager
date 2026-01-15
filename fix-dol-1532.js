// Script to manually fix DOL-1532
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTicket() {
    try {
        const ticket = await prisma.ticket.findFirst({
            where: { issueKey: 'DOL-1532' }
        });

        if (!ticket) {
            console.log('❌ Ticket not found');
            return;
        }

        console.log('Found ticket:', ticket.issueKey);
        console.log('Current: year=' + ticket.year + ', month=' + ticket.month);
        console.log('Created:', ticket.createdDate);

        // Recalculate from creation date
        const createdDate = new Date(ticket.createdDate);
        const correctYear = createdDate.getFullYear();
        const correctMonth = createdDate.getMonth() + 1;

        console.log('\nCorrect values: year=' + correctYear + ', month=' + correctMonth);

        // Update the ticket
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                year: correctYear,
                month: correctMonth
            }
        });

        console.log('\n✅ Ticket updated successfully!');
        console.log('DOL-1532 should now appear in March (03/2025)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixTicket();
