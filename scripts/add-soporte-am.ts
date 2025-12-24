import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSoporteAMTicketType() {
  try {
    // Check if "Soporte AM" already exists
    const existing = await prisma.parameter.findFirst({
      where: {
        category: 'VALID_TICKET_TYPE',
        value: 'Soporte AM'
      }
    });

    if (existing) {
      console.log('✓ "Soporte AM" already exists in VALID_TICKET_TYPE');
      return;
    }

    // Get the highest order value for VALID_TICKET_TYPE
    const maxOrder = await prisma.parameter.findFirst({
      where: { category: 'VALID_TICKET_TYPE' },
      orderBy: { order: 'desc' }
    });

    const nextOrder = (maxOrder?.order || 0) + 1;

    // Add "Soporte AM" as a valid ticket type
    await prisma.parameter.create({
      data: {
        category: 'VALID_TICKET_TYPE',
        label: 'Soporte AM',
        value: 'Soporte AM',
        isActive: true,
        order: nextOrder
      }
    });

    console.log('✓ Added "Soporte AM" to VALID_TICKET_TYPE');

    // Show all valid ticket types
    const allTypes = await prisma.parameter.findMany({
      where: { category: 'VALID_TICKET_TYPE' },
      orderBy: { order: 'asc' }
    });

    console.log('\nCurrent VALID_TICKET_TYPE parameters:');
    allTypes.forEach(type => {
      console.log(`  - ${type.label} (${type.value}) [Order: ${type.order}]`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSoporteAMTicketType();
