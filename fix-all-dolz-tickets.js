// Script to fix ALL DOLZ EVENTOS tickets
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllDolzTickets() {
    try {
        // Get DOLZ work package
        const wp = await prisma.workPackage.findFirst({
            where: {
                client: { name: 'DOLZ' },
                contractType: 'EVENTOS'
            },
            include: {
                tickets: true
            }
        });

        if (!wp) {
            console.log('❌ DOLZ EVENTOS work package not found');
            return;
        }

        console.log('Found work package:', wp.name);
        console.log('Total tickets:', wp.tickets.length);

        let fixed = 0;
        let alreadyCorrect = 0;

        for (const ticket of wp.tickets) {
            const createdDate = new Date(ticket.createdDate);
            const correctYear = createdDate.getFullYear();
            const correctMonth = createdDate.getMonth() + 1;

            if (ticket.year !== correctYear || ticket.month !== correctMonth) {
                console.log(`\nFixing ${ticket.issueKey}:`);
                console.log(`  Created: ${ticket.createdDate}`);
                console.log(`  Old: year=${ticket.year}, month=${ticket.month}`);
                console.log(`  New: year=${correctYear}, month=${correctMonth}`);

                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: {
                        year: correctYear,
                        month: correctMonth
                    }
                });
                fixed++;
            } else {
                alreadyCorrect++;
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`✅ Fixed: ${fixed} tickets`);
        console.log(`✓ Already correct: ${alreadyCorrect} tickets`);
        console.log(`📊 Total: ${wp.tickets.length} tickets`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAllDolzTickets();
