import { NextResponse } from 'next/server';
import { getHitos, getEvolutivos } from '@/lib/ama-evolutivos/jira';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const hitos = await getHitos();
        const evolutivos = await getEvolutivos();

        // Extraer gestores únicos del campo customfield_10254 (Gestor del ticket)
        const gestoresMap = new Map();

        const extractGestor = (issue: any) => {
            const gestor = issue.fields?.customfield_10254; // Campo Gestor del ticket
            if (gestor && gestor.accountId) {
                return {
                    id: gestor.accountId,
                    name: gestor.displayName,
                    displayName: gestor.displayName,
                    avatarUrl: gestor.avatarUrls?.['48x48'],
                    emailAddress: gestor.emailAddress,
                };
            }
            return null;
        };

        // Procesar todos para extraer gestores
        [...evolutivos, ...hitos].forEach(issue => {
            const g = extractGestor(issue);
            if (g) gestoresMap.set(g.id, g);
        });

        // Crear mapa de evolutivos para acceso rápido
        const evolutivosMap = new Map();
        evolutivos.forEach(evo => {
            const orgs = evo.fields?.customfield_10002 || [];
            const organization = orgs.length > 0 ? orgs[0].name : null;

            evolutivosMap.set(evo.key, {
                gestor: extractGestor(evo),
                organization: organization,
                summary: evo.fields?.summary
            });
        });

        // Procesar hitos y clasificarlos
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        const processedIssues: JiraIssue[] = hitos.map((issue: any) => {
            const parentKey = issue.fields.parent?.key;
            const parentDetails = parentKey ? evolutivosMap.get(parentKey) : null;

            // Intentar obtener gestor del hito o del evolutivo padre
            let gestor = extractGestor(issue) || parentDetails?.gestor;

            // Obtener datos del responsable (assignee)
            const assignee = issue.fields?.assignee;

            return {
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status?.name || 'Unknown',
                issueType: issue.fields.issuetype?.name || 'Unknown',
                dueDate: issue.fields.duedate,
                gestor: gestor ? {
                    id: gestor.id,
                    name: gestor.name,
                    avatarUrl: gestor.avatarUrl,
                } : undefined,
                parentKey: parentKey,
                parent: parentKey ? {
                    key: parentKey,
                    summary: parentDetails?.summary || 'Sin Título'
                } : undefined,
                organization: parentDetails?.organization,
                assignee: assignee ? {
                    id: assignee.accountId,
                    displayName: assignee.displayName,
                    avatarUrl: assignee.avatarUrls?.['48x48']
                } : undefined,
                pendingHitos: 0,
            };
        });

        // Clasificar issues
        const expired: JiraIssue[] = [];
        const todayIssues: JiraIssue[] = [];
        const upcoming: JiraIssue[] = [];
        const others: JiraIssue[] = [];
        const unplanned: JiraIssue[] = [];

        processedIssues.forEach((issue: any) => {
            const dueDate = issue.dueDate;
            const plannedDate = hitos.find((h: any) => h.key === issue.key)?.fields?.customfield_10015;
            const effectiveDateStr = dueDate || plannedDate;

            if (!effectiveDateStr) {
                unplanned.push(issue);
                return;
            }

            const effectiveDate = new Date(effectiveDateStr);
            const dueDateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());

            if (dueDateOnly < today) {
                expired.push(issue);
            } else if (dueDateOnly.getTime() === today.getTime()) {
                todayIssues.push(issue);
            } else if (dueDateOnly <= in7Days) {
                upcoming.push(issue);
            } else {
                others.push(issue);
            }
        });

        const response: DashboardData = {
            summary: {
                expired: expired.length,
                today: todayIssues.length,
                upcoming: upcoming.length,
                others: others.length,
                unplanned: unplanned.length,
                activeEvolutivos: evolutivos.length
            },
            issues: {
                expired,
                today: todayIssues,
                upcoming,
                others,
                unplanned,
            },
            managers: Array.from(gestoresMap.values()),
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error fetching AMA Evolutivos issues:', error);
        return NextResponse.json(
            { error: error.message || 'Error fetching issues' },
            { status: 500 }
        );
    }
}
