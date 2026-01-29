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

        const sorted = allTypes.sort((a, b) => b._count - a._count);

        let output = '=== TODOS LOS TIPOS EN 2024 ===\n';
        let total = 0;
        sorted.forEach(t => {
            output += `${t.issueType}: ${t._count}\n`;
            total += t._count;
        });
        output += `\nTOTAL: ${total}\n`;

        fs.writeFileSync('tipos-2024.txt', output, 'utf8');
        console.log(output);
        console.log('Guardado en tipos-2024.txt');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
