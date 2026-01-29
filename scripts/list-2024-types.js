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
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
        // Todos los tipos en 2024 SIN filtro
        const allTypes = await prisma.ticket.groupBy({
            by: ['issueType'],
            where: {
                createdDate: {
                    gte: new Date('2024-01-01T00:00:00Z'),
                    lte: new Date('2024-12-31T23:59:59Z')
                }
            },
            _count: true
        });

        console.log('=== TODOS LOS TIPOS EN 2024 (sin filtro) ===');
        let totalAll = 0;
        allTypes.forEach(t => {
            console.log(`${t.issueType}: ${t._count}`);
            totalAll += t._count;
        });
        console.log(`TOTAL SIN FILTRO: ${totalAll}`);

        console.log('\n=== CON FILTRO (excluyendo Hitos) ===');
        const filtered = await prisma.ticket.groupBy({
            by: ['issueType'],
            where: {
                createdDate: {
                    gte: new Date('2024-01-01T00:00:00Z'),
                    lte: new Date('2024-12-31T23:59:59Z')
                },
                NOT: {
                    issueType: { in: ['Hito evolutivo', 'Hitos Evolutivos'], mode: 'insensitive' }
                }
            },
            _count: true
        });

        let totalFiltered = 0;
        filtered.forEach(t => {
            console.log(`${t.issueType}: ${t._count}`);
            totalFiltered += t._count;
        });
        console.log(`TOTAL CON FILTRO: ${totalFiltered}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
