// app/api/ama-evolutivos/issues/route.ts
// API para obtener issues y hitos del módulo AMA Evolutivos

import { NextResponse } from 'next/server';
import { getHitos, getEvolutivos } from '@/lib/ama-evolutivos/jira';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';

export async function GET(request: Request) {
    try {
        const hitos = await getHitos();
        const evolutivos = await getEvolutivos();

        // Extraer gestores únicos del campo customfield_10051 de los evolutivos
        const gestoresMap = new Map();
        evolutivos.forEach((evo: any) => {
            const gestor = evo.fields?.customfield_10051; // Campo Gestor
            if (gestor && gestor.accountId) {
                gestoresMap.set(gestor.accountId, {
                    id: gestor.accountId,
                    name: gestor.displayName,
                    displayName: gestor.displayName,
                    avatarUrl: gestor.avatarUrls?.['48x48'],
                    emailAddress: gestor.emailAddress,
                });
            }
        });

        // Procesar hitos y clasificarlos
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        const processedIssues: JiraIssue[] = hitos.map((issue: any) => {
            // Buscar el gestor del evolutivo padre
            const parentEvo = evolutivos.find((evo: any) => evo.key === issue.fields.parent?.key);
            const gestor = parentEvo?.fields?.customfield_10051;

            return {
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                issueType: issue.fields.issuetype.name,
                dueDate: issue.fields.duedate,
                gestor: gestor ? {
                    id: gestor.accountId,
                    name: gestor.displayName,
                    avatarUrl: gestor.avatarUrls?.['48x48'],
                } : undefined,
                parentKey: issue.fields.parent?.key,
                pendingHitos: 0, // Se calculará después
            };
        });

        // Clasificar issues
        const expired: JiraIssue[] = [];
        const todayIssues: JiraIssue[] = [];
        const upcoming: JiraIssue[] = [];
        const others: JiraIssue[] = [];
        const unplanned: JiraIssue[] = [];

        processedIssues.forEach((issue) => {
            if (!issue.dueDate) {
                unplanned.push(issue);
                return;
            }

            const dueDate = new Date(issue.dueDate);
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

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
