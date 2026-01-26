// app/api/ama-evolutivos/sync-daily/route.ts
// API para sincronizar métrica diaria de evolutivos

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getEvolutivos, getWorkloadMetrics } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        // 1. Verificar autorización
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // Comprobar si es un Cron Job válido
        const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

        // Comprobar si es un Usuario Administrador logueado
        const session = await getAuthSession();
        const isAdmin = session?.userRole === 'ADMIN';

        if (!isCronJob && !isAdmin) {
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

        // 3. Registrar en ImportLog para trazabilidad en Admin
        await prisma.importLog.create({
            data: {
                date: today,
                type: 'AMA_DAILY_SYNC',
                status: 'SUCCESS',
                totalRows: 2, // Incidencias y Evolutivos
                processedCount: 2,
                filename: 'Jira Auto Sync',
                errors: JSON.stringify({
                    legacyCount: count,
                    workload: workload,
                    timestamp: new Date().toISOString()
                })
            }
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

        // Registrar error en ImportLog
        try {
            await prisma.importLog.create({
                data: {
                    date: new Date(),
                    type: 'AMA_DAILY_SYNC',
                    status: 'ERROR',
                    filename: 'Jira Auto Sync',
                    errors: error.message || 'Error desconocido'
                }
            });
        } catch (logError) {
            console.error('Failed to log sync error:', logError);
        }

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
