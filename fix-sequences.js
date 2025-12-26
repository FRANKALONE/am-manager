const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing sequences...');
    try {
        // Fix Parameter sequence
        await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Parameter"', 'id'), (SELECT MAX(id) FROM "Parameter"))`;
        console.log('Parameter sequence fixed.');

        // Fix other tables with autoincrement IDs if needed
        const tables = ['Regularization', 'ValidityPeriod', 'CorrectionModel', 'WPCorrection', 'MonthlyMetric', 'WorklogDetail', 'Ticket', 'ImportLog'];
        for (const table of tables) {
            try {
                await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`);
                console.log(`Sequence for ${table} fixed.`);
            } catch (e) {
                console.log(`Table ${table} might not have a serial sequence or error: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('Error fixing sequences:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
