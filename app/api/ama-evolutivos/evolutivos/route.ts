// app/api/ama-evolutivos/evolutivos/route.ts
// API para obtener lista de evolutivos del módulo AMA Evolutivos

import { NextResponse } from 'next/server';
import { getEvolutivos, getHitos } from '@/lib/ama-evolutivos/jira';
import type { JiraIssue } from '@/lib/ama-evolutivos/types';

export async function GET(request: Request) {
    try {
        const evolutivos = await getEvolutivos();
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

        // Procesar evolutivos
        const processedEvolutivos: JiraIssue[] = evolutivos.map((evo: any) => {
            const relatedHitos = hitosByEvolutivo.get(evo.key) || [];
            const pendingHitos = relatedHitos.filter(
                (h: any) => h.fields.status.name !== 'Cerrado' && h.fields.status.name !== 'Done'
            ).length;

            const gestorField = evo.fields?.customfield_10254;

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
                organization: evo.fields.customfield_10002?.[0]?.name || undefined, // Organization field
                billingMode: evo.fields.customfield_10095?.value || undefined, // Billing Mode field
                gestor: gestorField ? {
                    id: gestorField.accountId,
                    name: gestorField.displayName,
                    avatarUrl: gestorField.avatarUrls?.['48x48'],
                } : undefined,
                pendingHitos,
                timeoriginalestimate: evo.fields.timeoriginalestimate || 0,
                timespent: evo.fields.timespent || 0,
                created: evo.fields.created,
                updated: evo.fields.updated,
                url: `${process.env.JIRA_URL || process.env.JIRA_DOMAIN}/browse/${evo.key}`,
            };
        });

        return NextResponse.json(processedEvolutivos);
    } catch (error: any) {
        console.error('Error fetching AMA Evolutivos:', error);
        return NextResponse.json(
            { error: error.message || 'Error fetching evolutivos' },
            { status: 500 }
        );
    }
}
