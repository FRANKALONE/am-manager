import { NextResponse } from 'next/server';
import { getClosedHitos, getIssuesByKeys } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';
import { differenceInDays, parseISO, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Obtener solo hitos cerrados (por defecto últimos 24 meses)
        const closedHitos = await getClosedHitos(24);

        console.log(`[Deviation API] Found ${closedHitos.length} closed hitos`);

        // 2. Extraer claves de evolutivos padre únicos para no traerlos todos
        const parentKeys = Array.from(new Set(
            closedHitos
                .map(h => h.fields.parent?.key)
                .filter(Boolean)
        )) as string[];

        // 3. Traer SOLO los evolutivos necesarios
        const evolutivos = await getIssuesByKeys(parentKeys, [
            'summary',
            'customfield_10254', // Gestor del ticket
            'customfield_10002', // Organization
        ]);

        console.log(`[Deviation API] Fetched ${evolutivos.length} relevant parent evolutivos`);

        // Mapeo de evolutivos para obtener organización y gestor
        const evolutivosMap = new Map();
        evolutivos.forEach(evo => {
            evolutivosMap.set(evo.key, {
                organization: evo.fields.customfield_10002?.[0]?.name,
                gestor: evo.fields.customfield_10254?.displayName,
                summary: evo.fields.summary
            });
        });

        const dataPoints: any[] = [];
        const skippedReasons = { noResolution: 0, noPlanned: 0 };
        const yearStats: Record<number, number> = {};

        closedHitos.forEach(hito => {
            // Soporte para ambos nombres de campo de fecha de cierre
            const resolutionDateStr = hito.fields.resolved || hito.fields.resolutiondate;
            // Priorizamos customfield_10015 (Fecha fin planificada) sobre duedate
            const plannedDateStr = hito.fields.customfield_10015 || hito.fields.duedate;

            if (!resolutionDateStr) {
                skippedReasons.noResolution++;
                return;
            }
            if (!plannedDateStr) {
                skippedReasons.noPlanned++;
                return;
            }

            const resolutionDate = parseISO(resolutionDateStr);
            const plannedDate = parseISO(plannedDateStr);
            const year = resolutionDate.getFullYear();

            // Stats
            yearStats[year] = (yearStats[year] || 0) + 1;

            // Desviación en días (Positivo = Retraso, Negativo = Adelanto)
            const deviationDays = differenceInDays(resolutionDate, plannedDate);

            const parentKey = hito.fields.parent?.key;
            const parentInfo = parentKey ? evolutivosMap.get(parentKey) : null;

            const monthYear = format(resolutionDate, 'yyyy-MM');

            dataPoints.push({
                key: hito.key,
                summary: hito.fields.summary,
                resolutionDate: resolutionDateStr,
                plannedDate: plannedDateStr,
                deviationDays,
                monthYear,
                year,
                client: parentInfo?.organization || 'Desconocido',
                manager: hito.fields.customfield_10254?.displayName || parentInfo?.gestor || 'Sin Asignar',
                responsible: hito.fields.assignee?.displayName || 'Sin Asignar',
                evolutivo: parentKey || 'Sin Evolutivo',
                evolutivoSummary: parentInfo?.summary || 'Sin Título'
            });
        });

        const debugInfo = {
            closedHitosCount: closedHitos.length,
            evolutivosCount: evolutivos.length,
            processedCount: dataPoints.length,
            skipped: skippedReasons,
            yearStats,
            sampleHito: closedHitos.length > 0 ? {
                key: closedHitos[0].key,
                resolved: closedHitos[0].fields.resolved,
                resolutionDate: closedHitos[0].fields.resolutiondate,
                plannedDate: closedHitos[0].fields.customfield_10015,
                dueDate: closedHitos[0].fields.duedate
            } : null
        };

        console.log(`[Deviation API] Result: ${dataPoints.length} points. Debug:`, JSON.stringify(debugInfo));

        if (dataPoints.length === 0) {
            return NextResponse.json({
                data: [],
                debug: debugInfo
            });
        }

        return NextResponse.json(dataPoints);
    } catch (error: any) {
        console.error('Error fetching deviation data:', error);
        return NextResponse.json(
            { error: error.message || 'Error processing deviation data' },
            { status: 500 }
        );
    }
}
