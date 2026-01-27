import { NextResponse } from 'next/server';
import { getClosedHitos, getEvolutivos } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';
import { differenceInDays, parseISO, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obtener hitos cerrados (por defecto últimos 24 meses)
        const [closedHitos, evolutivos] = await Promise.all([
            getClosedHitos(24),
            getEvolutivos()
        ]);

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

        closedHitos.forEach(hito => {
            const resolutionDateStr = hito.fields.resolutiondate;
            // Priorizamos customfield_10015 (Fecha fin planificada) sobre duedate
            const plannedDateStr = hito.fields.customfield_10015 || hito.fields.duedate;

            if (resolutionDateStr && plannedDateStr) {
                const resolutionDate = parseISO(resolutionDateStr);
                const plannedDate = parseISO(plannedDateStr);

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
                    client: parentInfo?.organization || 'Desconocido',
                    manager: hito.fields.customfield_10254?.displayName || parentInfo?.gestor || 'Sin Asignar',
                    responsible: hito.fields.assignee?.displayName || 'Sin Asignar',
                    evolutivo: parentKey || 'Sin Evolutivo',
                    evolutivoSummary: parentInfo?.summary || 'Sin Título'
                });
            }
        });

        return NextResponse.json(dataPoints);
    } catch (error: any) {
        console.error('Error fetching deviation data:', error);
        return NextResponse.json(
            { error: error.message || 'Error processing deviation data' },
            { status: 500 }
        );
    }
}
