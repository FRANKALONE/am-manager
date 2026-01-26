import { NextResponse } from 'next/server';
import { getEvolutivos, getHitos } from '@/lib/ama-evolutivos/jira';
import type { JiraIssue } from '@/lib/ama-evolutivos/types';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const includeChildren = searchParams.get('includeChildren') === 'true';

    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const evolutivos = await getEvolutivos();

        // Fetch all hitos upfront if children are needed or for pending count
        const allHitos = await getHitos();

        // Crear un mapa de hitos por evolutivo (parent)
        const hitosByEvolutivo = new Map<string, any[]>();
        allHitos.forEach((hito: any) => {
            const parentKey = hito.fields.parent?.key;
            if (parentKey) {
                if (!hitosByEvolutivo.has(parentKey)) {
                    hitosByEvolutivo.set(parentKey, []);
                }
                hitosByEvolutivo.get(parentKey)!.push(hito);
            }
        });

        const EXCLUDED_BILLING_MODES = ['T&M facturable', 'T&M contra bolsa'];

        // Procesar evolutivos
        const processedEvolutivos = evolutivos.map((evo: any) => {
            const children = hitosByEvolutivo.get(evo.key) || [];

            // "Active" children for date calculation
            const activeChildren = children.filter((c: any) =>
                c.fields.status?.name !== 'Cerrado' && c.fields.status?.name !== 'Done'
            );

            // Find "Latest" due date among OPEN children
            let latestDateObj: Date | null = null;
            let latestDateStr: string | null = null;

            activeChildren.forEach((child: any) => {
                const dStr = child.fields.duedate;
                if (dStr) {
                    const d = new Date(dStr);
                    if (!latestDateObj || d > latestDateObj) {
                        latestDateObj = d;
                        latestDateStr = dStr;
                    }
                }
            });

            const gestorField = evo.fields?.customfield_10254;
            const organization = evo.fields.customfield_10002?.[0]?.name || undefined;
            const billingMode = evo.fields.customfield_10095?.value || undefined;

            // Legacy Filter: If Unplanned AND Billing Mode is Excluded
            if (activeChildren.length === 0 && EXCLUDED_BILLING_MODES.includes(billingMode || '')) {
                return null;
            }

            return {
                id: evo.id,
                key: evo.key,
                summary: evo.fields.summary,
                status: evo.fields.status?.name || 'Unknown',
                issueType: evo.fields.issuetype?.name || 'Unknown',
                assignee: evo.fields.assignee ? {
                    id: evo.fields.assignee.accountId,
                    displayName: evo.fields.assignee.displayName,
                    avatarUrl: evo.fields.assignee.avatarUrls?.['48x48'],
                } : undefined,
                organization,
                billingMode,
                gestor: gestorField ? {
                    id: gestorField.accountId,
                    name: gestorField.displayName,
                    avatarUrl: gestorField.avatarUrls?.['48x48'],
                } : undefined,
                pendingHitos: activeChildren.length,
                totalHitos: children.length,
                latestDeadline: latestDateStr,
                timeoriginalestimate: evo.fields.timeoriginalestimate || 0,
                timespent: evo.fields.timespent || 0,
                created: evo.fields.created,
                updated: evo.fields.updated,
                url: `${process.env.JIRA_URL || process.env.JIRA_DOMAIN}/browse/${evo.key}`,
                children: includeChildren ? children : undefined
            };
        }).filter(Boolean);

        return NextResponse.json(processedEvolutivos);
    } catch (error: any) {
        console.error('Error fetching AMA Evolutivos:', error);
        return NextResponse.json(
            { error: error.message || 'Error fetching evolutivos' },
            { status: 500 }
        );
    }
}
