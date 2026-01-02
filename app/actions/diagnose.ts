"use server";

import { fetchJira } from "@/lib/jira";
import { prisma } from "@/lib/prisma";

export async function diagnoseEvolutivosSync(clientId: string) {
    try {
        // 1. Get client and work packages
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { workPackages: true }
        });

        if (!client) {
            return { success: false, error: "Cliente no encontrado" };
        }

        // 2. Get project keys from work packages
        const projectKeys = Array.from(
            new Set(
                client.workPackages
                    .map(wp => wp.jiraProjectKeys?.split(',') || [])
                    .flat()
                    .filter(Boolean)
            )
        );

        if (projectKeys.length === 0) {
            return { success: false, error: "No hay proyectos de Jira configurados para este cliente" };
        }

        // 3. Query Jira
        const projectList = projectKeys.join(',');
        const jql = `project IN (${projectList}) AND issuetype IN ("Evolutivo", "Hitos Evolutivos") ORDER BY created DESC`;

        const jiraRes = await fetchJira(`/search/jql`, {
            method: "POST",
            body: JSON.stringify({
                jql,
                maxResults: 1000,
                fields: ['key', 'summary', 'status', 'issuetype', 'customfield_10121', 'created']
            })
        });

        const jiraEvolutivos = jiraRes.issues?.filter((i: any) => i.fields.issuetype.name === 'Evolutivo') || [];
        const jiraHitos = jiraRes.issues?.filter((i: any) => i.fields.issuetype.name === 'Hitos Evolutivos') || [];

        // 4. Query Database
        const wpIds = client.workPackages.map(wp => wp.id);
        const dbTickets = await prisma.ticket.findMany({
            where: {
                workPackageId: { in: wpIds },
                issueType: { in: ['Evolutivo', 'Hitos Evolutivos'] }
            }
        });

        const dbEvolutivos = dbTickets.filter(t => t.issueType === 'Evolutivo');
        const dbHitos = dbTickets.filter(t => t.issueType === 'Hitos Evolutivos');

        // 5. Find missing tickets
        const jiraEvolutivoKeys = new Set(jiraEvolutivos.map((e: any) => e.key));
        const dbEvolutivoKeys = new Set(dbEvolutivos.map(e => e.issueKey));

        const missingInDb = jiraEvolutivos.filter((e: any) => !dbEvolutivoKeys.has(e.key));
        const extraInDb = dbEvolutivos.filter(e => !jiraEvolutivoKeys.has(e.issueKey));

        // 6. Check pagination warning
        const paginationWarning = jiraRes.total && jiraRes.total > (jiraRes.issues?.length || 0);

        return {
            success: true,
            data: {
                client: {
                    name: client.name,
                    projectKeys
                },
                jira: {
                    total: jiraRes.total || 0,
                    returned: jiraRes.issues?.length || 0,
                    evolutivos: jiraEvolutivos.length,
                    hitos: jiraHitos.length,
                    paginationWarning,
                    missingCount: paginationWarning ? (jiraRes.total - (jiraRes.issues?.length || 0)) : 0
                },
                database: {
                    evolutivos: dbEvolutivos.length,
                    hitos: dbHitos.length
                },
                discrepancies: {
                    missingInDb: missingInDb.map((e: any) => ({
                        key: e.key,
                        summary: e.fields.summary,
                        status: e.fields.status.name,
                        billingMode: e.fields.customfield_10121?.value || 'N/A',
                        created: e.fields.created
                    })),
                    extraInDb: extraInDb.map(e => ({
                        key: e.issueKey,
                        summary: e.issueSummary
                    }))
                },
                jql
            }
        };
    } catch (error: any) {
        console.error("Error in diagnoseEvolutivosSync:", error);
        return { success: false, error: error.message };
    }
}
