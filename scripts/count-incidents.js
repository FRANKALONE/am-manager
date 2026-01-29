const fs = require('fs');
const path = require('path');

function getEnvVar(name) {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(new RegExp(`${name}=["']?([^"'\\n]+)["']?`));
        return match ? match[1] : null;
    }
    return null;
}

async function main() {
    const dbUrl = getEnvVar('DATABASE_URL');
    if (!dbUrl) {
        console.error('DATABASE_URL not found');
        process.exit(1);
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const count2024 = await prisma.ticket.count({
            where: {
                createdDate: {
                    gte: new Date('2024-01-01T00:00:00Z'),
                    lte: new Date('2024-12-31T23:59:59Z')
                },
                NOT: {
                    issueType: { in: ['Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
                }
            }
        });

        const count2025 = await prisma.ticket.count({
            where: {
                createdDate: {
                    gte: new Date('2025-01-01T00:00:00Z'),
                    lte: new Date('2025-12-31T23:59:59Z')
                },
                NOT: {
                    issueType: { in: ['Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
                }
            }
        });

        console.log('INCIDENTS_2024:', count2024);
        console.log('INCIDENTS_2025:', count2025);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
