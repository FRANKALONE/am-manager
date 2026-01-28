// scripts/verify-am-dashboard-fix.ts
import { prisma } from '../lib/prisma';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function verify() {
    console.log('=== VERIFICACIÓN DE CORRECCIONES AM DASHBOARD ===\n');

    const year = 2025;
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year}-12-31T23:59:59Z`);

    try {
        // 1. Ofertas Enviadas (NUEVA LÓGICA)
        console.log('1. OFERTAS ENVIADAS (Nueva lógica)');
        console.log('   Criterio: Solo "Petición de Evolutivo" con estados específicos\n');

        const sentTransitions = await prisma.ticketStatusHistory.findMany({
            where: {
                status: {
                    in: [
                        'Oferta Generada',
                        'Oferta enviada al cliente',
                        'Oferta enviada al gerente'
                    ],
                    mode: 'insensitive'
                },
                transitionDate: { gte: start, lte: end }
            }
        });

        const sentPeticiones = await prisma.ticket.findMany({
            where: {
                issueKey: { in: sentTransitions.map(t => t.issueKey) },
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
            }
        });

        // Deduplicate
        const uniqueKeys = new Set();
        sentTransitions.forEach(t => {
            if (sentPeticiones.some(p => p.issueKey === t.issueKey)) {
                uniqueKeys.add(t.issueKey);
            }
        });

        console.log(`   ✓ Total transiciones encontradas: ${sentTransitions.length}`);
        console.log(`   ✓ Peticiones de Evolutivo únicas: ${uniqueKeys.size}\n`);

        // 2. Ofertas Aprobadas (NUEVA LÓGICA)
        console.log('2. OFERTAS APROBADAS (Nueva lógica)');
        console.log('   Criterio: "Petición de Evolutivo" + Status=Cerrado + Resolution=Aprobada\n');

        const approvedPeticiones = await prisma.ticket.findMany({
            where: {
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' },
                status: { equals: 'Cerrado', mode: 'insensitive' },
                resolution: { equals: 'Aprobada', mode: 'insensitive' },
                createdDate: { gte: start, lte: end }
            }
        });

        console.log(`   ✓ Peticiones Aprobadas: ${approvedPeticiones.length}\n`);

        // 3. Verificar valores únicos de Status y Resolution
        console.log('3. VALORES ÚNICOS EN BD (para validar case-insensitive)');

        const uniqueStatuses = await prisma.ticket.groupBy({
            by: ['status'],
            where: {
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
            }
        });

        const uniqueResolutions = await prisma.ticket.groupBy({
            by: ['resolution'],
            where: {
                issueType: { equals: 'Petición de Evolutivo', mode: 'insensitive' }
            }
        });

        console.log('   Status únicos en Petición de Evolutivo:');
        uniqueStatuses.forEach(s => console.log(`     - ${s.status || 'NULL'}`));

        console.log('\n   Resolution únicos en Petición de Evolutivo:');
        uniqueResolutions.forEach(r => console.log(`     - ${r.resolution || 'NULL'}`));

        // 4. Resumen comparativo
        console.log('\n=== RESUMEN ===');
        console.log(`Ofertas Enviadas: ${uniqueKeys.size} (antes: 35, esperado: ~81)`);
        console.log(`Ofertas Aprobadas: ${approvedPeticiones.length} (antes: 0)`);

        if (approvedPeticiones.length > 0) {
            const ratio = (approvedPeticiones.length / uniqueKeys.size) * 100;
            console.log(`Ratio Aceptación: ${ratio.toFixed(1)}% (antes: 0.0%)`);
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
