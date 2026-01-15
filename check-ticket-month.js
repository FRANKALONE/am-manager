// Quick script to check DOL-1532 in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTicket() {
    try {
        const ticket = await prisma.ticket.findFirst({
            where: {
                issueKey: 'DOL-1532'
            },
            include: {
                workPackage: {
                    select: {
                        name: true,
                        contractType: true,
                        client: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (ticket) {
            console.log('=== TICKET DOL-1532 ===');
            console.log('Client:', ticket.workPackage.client.name);
            console.log('Work Package:', ticket.workPackage.name);
            console.log('Contract Type:', ticket.workPackage.contractType);
            console.log('Created Date:', ticket.createdDate);
            console.log('Year (DB):', ticket.year);
            console.log('Month (DB):', ticket.month);
            console.log('Issue Type:', ticket.issueType);
            console.log('Status:', ticket.status);
            console.log('\nExpected: year=2025, month=3 (March)');
            console.log('Actual: year=' + ticket.year + ', month=' + ticket.month);

            if (ticket.year === 2025 && ticket.month === 4) {
                console.log('\n❌ ERROR: Ticket is still in April in database!');
            } else if (ticket.year === 2025 && ticket.month === 3) {
                console.log('\n✅ Database is correct - issue must be in display logic');
            }
        } else {
            console.log('❌ Ticket DOL-1532 not found in database');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTicket();
