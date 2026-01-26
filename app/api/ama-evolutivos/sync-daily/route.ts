// app/api/ama-evolutivos/sync-daily/route.ts
// API para sincronizar métrica diaria de evolutivos

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getEvolutivos, getWorkloadMetrics } from '@/lib/ama-evolutivos/jira';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        // Verificar si viene de cron job o manual
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // Si hay secret configurado, verificar que coincida
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Obtener todos los evolutivos activos (Legacy logic)
        const evolutivos = await getEvolutivos();

        // Filtrar solo evolutivos activos (no cerrados)
        const activeEvolutivos = evolutivos.filter((evo: any) => {
            const status = evo.fields?.status?.name?.toLowerCase() || '';
            return !['done', 'closed', 'cerrado'].includes(status);
        });

        const count = activeEvolutivos.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a inicio del día

        // 1. Guardar o actualizar la métrica de evolutivos (Legacy)
        const metric = await prisma.eVOLDailyMetric.upsert({
            where: { date: today },
            update: {
                count,
                updatedAt: new Date(),
            },
            create: {
                date: today,
                count,
            },
        });

        // 2. Nueva lógica: Guardar métrica detallada en AMADailyWorkload
        const workload = await getWorkloadMetrics();

        const workloadMetric = await prisma.aMADailyWorkload.upsert({
            where: { date: today },
            update: {
                incidenciasCount: workload.incidencias,
                evolutivosCount: workload.evolutivos,
                updatedAt: new Date(),
            },
            create: {
                date: today,
                incidenciasCount: workload.incidencias,
                evolutivosCount: workload.evolutivos,
            },
        });

        return NextResponse.json({
            success: true,
            date: today.toISOString(),
            legacyCount: count,
            workload: {
                incidencias: workload.incidencias,
                evolutivos: workload.evolutivos
            },
            message: `Métricas guardadas correctamente para el día ${today.toLocaleDateString()}`,
        });
    } catch (error: any) {
        console.error('Error syncing daily metric:', error);
        return NextResponse.json(
            { error: error.message || 'Error syncing daily metric' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// También permitir GET para facilitar testing manual
export async function GET(request: Request) {
    return POST(request);
}
