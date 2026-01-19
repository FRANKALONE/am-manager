"use server";

import { prisma } from "@/lib/prisma";
import { fetchJira } from "@/lib/jira";
import { searchJiraIssues } from "@/lib/ama-evolutivos/jira";
import { fetchTempo } from "@/lib/tempo";
import { revalidatePath } from "next/cache";
import { getVisibilityFilter, canAccessClient } from "@/lib/auth";


// Sync constant for Evolutivo issue types
const EVOLUTIVO_TYPES = ["Evolutivo", "Hitos Evolutivos"];
const EVOLUTIVO_BILLING_MODES = ["T&M contra bolsa", "Bolsa de Horas", "T&M Facturable", "Facturable"];

export async function getEvolutivosByClient(clientId: string) {
    if (!await canAccessClient(clientId)) {
        return { evolutivos: [], hitos: [], workPackages: [], proposals: [] };
    }
    try {
        // Find all work packages for this client
        const workPackages = await prisma.workPackage.findMany({
            where: { clientId },
            select: { id: true, name: true }
        });

        const proposals = await (prisma as any).evolutivoProposal.findMany({
            where: { clientId },
            orderBy: { createdDate: 'desc' }
        });

        const wpIds = workPackages.map(wp => wp.id);

        // Find all Evolutivos (no filters - show all)
        const evolutivos = await (prisma.ticket as any).findMany({
            where: {
                workPackageId: { in: wpIds },
                issueType: 'Evolutivo'
            },
            orderBy: { createdDate: 'desc' }
        });

        // Enrich with Tempo data or estimates
        const enrichedEvolutivos = await Promise.all(evolutivos.map(async (evo: any) => {
            let detail: any = {
                accumulatedHours: 0,
                originalEstimate: evo.originalEstimate || 0,
                pendingPlanning: false
            };

            // Check if T&M
            const isTM = evo.billingMode === "T&M contra bolsa" || evo.billingMode === "T&M Facturable";

            if (isTM) {
                detail.accumulatedHours = await getAccumulatedHoursWithCorrection(evo.issueKey);
            }

            return { ...evo, ...detail };
        }));

        // Find all Hitos for these Evolutivos
        const evolutivoKeys = enrichedEvolutivos.map(e => e.issueKey);
        const hitos = await (prisma.ticket as any).findMany({
            where: {
                workPackageId: { in: wpIds },
                issueType: 'Hitos Evolutivos',
                parentKey: { in: evolutivoKeys }
            },
            orderBy: { dueDate: 'asc' }
        });

        // Mark as "Pending Planning" if no milestones or no due dates
        const finalEvolutivos = enrichedEvolutivos.map(evo => {
            const evoHitos = hitos.filter((h: any) => h.parentKey === evo.issueKey);
            const hasNoDueDates = evoHitos.length > 0 && evoHitos.every((h: any) => !h.dueDate);
            const isPending = evoHitos.length === 0 || hasNoDueDates;
            return { ...evo, pendingPlanning: isPending };
        });

        return {
            evolutivos: finalEvolutivos,
            hitos,
            workPackages,
            proposals
        };
    } catch (error) {
        console.error("Error in getEvolutivosByClient:", error);
        return { evolutivos: [], hitos: [], workPackages: [], proposals: [] };
    }
}

async function getAccumulatedHoursWithCorrection(issueKey: string) {
    try {
        // Find default correction model
        const defaultModel = await prisma.correctionModel.findFirst({
            where: { isDefault: true, status: 'active' }
        });

        let correctionFactor = 1.0;
        if (defaultModel) {
            try {
                const config = JSON.parse(defaultModel.config);
                correctionFactor = config.factor || 1.0;
            } catch (e) { }
        }

        // Fetch worklogs from Tempo
        const jiraIssue = await fetchJira(`/issue/${issueKey}?fields=id`);
        const issueId = parseInt(jiraIssue.id);

        if (!issueId) return 0;

        const tempoRes = await fetchTempo("/worklogs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                issueId: [issueId],
                from: "2020-01-01",
                to: new Date().toISOString().split('T')[0],
                limit: 1000
            })
        });

        const totalSeconds = (tempoRes.results || []).reduce((acc: number, wl: any) => acc + (wl.timeSpentSeconds || 0), 0);
        const totalHours = totalSeconds / 3600;

        return totalHours * correctionFactor;
    } catch (error) {
        return 0;
    }
}

export async function syncTotalEvolutivos() {
    try {
        const filter = await getVisibilityFilter();
        const where: any = {};

        if (!filter.isGlobal) {
            where.OR = [];
            if (filter.clientIds) {
                where.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.OR.push({ manager: filter.managerId });
            }
            if (where.OR.length === 0) return { success: false, error: "No tienes clientes asignados para sincronizar", message: undefined };
        }

        const clients = await prisma.client.findMany({
            where,
            include: { workPackages: true }
        });

        let allProjectKeys = new Set<string>();

        // 1. Populate client.jiraProjectKey and collect all keys
        for (const client of clients) {
            const keys = client.workPackages
                .map(wp => wp.jiraProjectKeys)
                .join(',')
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);

            const uniqueKeys = Array.from(new Set(keys)).join(',');

            if (uniqueKeys && (client as any).jiraProjectKey !== uniqueKeys) {
                await (prisma.client as any).update({
                    where: { id: client.id },
                    data: { jiraProjectKey: uniqueKeys }
                });
            }

            keys.forEach(k => allProjectKeys.add(k));
        }

        return await syncEvolutivosByProjectKeys(Array.from(allProjectKeys));
    } catch (error: any) {
        console.error("Error in syncTotalEvolutivos:", error);
        return { success: false, error: error.message, message: undefined };
    }
}

export async function syncClientEvolutivos(clientId: string) {
    if (!await canAccessClient(clientId)) {
        return { success: false, message: "No autorizado para este cliente" };
    }
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { workPackages: true }
        });

        if (!client) return { success: false, error: "Cliente no encontrado", message: undefined };

        const keys = client.workPackages
            .map(wp => wp.jiraProjectKeys)
            .join(',')
            .split(',')
            .map(k => k.trim())
            .filter(Boolean);

        const projectKeys = Array.from(new Set(keys));

        if (projectKeys.length === 0) return { success: false, error: "Este cliente no tiene claves de proyecto JIRA asociadas", message: undefined };

        // Also update client.jiraProjectKey for convenience
        const uniqueKeysStr = projectKeys.join(',');
        if ((client as any).jiraProjectKey !== uniqueKeysStr) {
            await (prisma.client as any).update({
                where: { id: clientId },
                data: { jiraProjectKey: uniqueKeysStr }
            });
        }

        const res = await syncEvolutivosByProjectKeys(projectKeys);

        revalidatePath("/dashboard/evolutivos");
        return res;
    } catch (error: any) {
        console.error("Error in syncClientEvolutivos:", error);
        return { success: false, error: error.message, message: undefined };
    }
}

async function syncEvolutivosByProjectKeys(projectKeys: string[]) {
    const startTime = Date.now();
    try {
        if (projectKeys.length === 0) return { success: false, error: "No hay proyectos que sincronizar", message: undefined };

        const projectList = projectKeys.map(k => `"${k}"`).join(',');

        // First: Fetch all Evolutivos with pagination
        const evolutivosJql = `project IN (${projectList}) AND issuetype = "Evolutivo" ORDER BY created DESC`;
        const evolutivos = await searchJiraIssues(evolutivosJql, [
            'key', 'summary', 'status', 'issuetype', 'assignee', 'duedate', 'parent',
            'customfield_10121', 'created', 'timeoriginalestimate', 'priority'
        ]);

        // Second: Fetch all Hitos with pagination
        const hitosJql = `project IN (${projectList}) AND issuetype = "Hitos Evolutivos" ORDER BY created DESC`;
        const hitos = await searchJiraIssues(hitosJql, [
            'key', 'summary', 'status', 'issuetype', 'assignee', 'duedate', 'parent',
            'customfield_10121', 'created', 'timeoriginalestimate', 'priority'
        ]);

        const allIssues = [...evolutivos, ...hitos];
        if (allIssues.length === 0) return { success: false, error: "No se encontraron tickets en JIRA", message: undefined };

        let upsertedCount = 0;
        for (const issue of allIssues) {
            const fields = issue.fields;
            const issueType = fields.issuetype?.name;
            const billingModeRaw = fields.customfield_10121;
            const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || null;
            const parentKey = fields.parent?.key || null;

            const projectKey = issue.key.split('-')[0];
            const wp = await prisma.workPackage.findFirst({
                where: { jiraProjectKeys: { contains: projectKey } }
            });

            if (!wp) continue;

            await (prisma.ticket as any).upsert({
                where: {
                    workPackageId_issueKey: {
                        workPackageId: wp.id,
                        issueKey: issue.key
                    }
                },
                update: {
                    status: fields.status?.name || 'Unknown',
                    issueSummary: fields.summary || '',
                    issueType: issueType,
                    assignee: fields.assignee?.displayName || null,
                    dueDate: fields.duedate ? new Date(fields.duedate) : null,
                    parentKey: parentKey,
                    billingMode: billingMode,
                    priority: fields.priority?.name || 'Media',
                    originalEstimate: fields.timeoriginalestimate ? fields.timeoriginalestimate / 3600 : null
                },
                create: {
                    issueKey: issue.key,
                    status: fields.status?.name || 'Unknown',
                    issueSummary: fields.summary || '',
                    issueType: issueType,
                    workPackageId: wp.id,
                    assignee: fields.assignee?.displayName || null,
                    dueDate: fields.duedate ? new Date(fields.duedate) : null,
                    parentKey: parentKey,
                    billingMode: billingMode,
                    priority: fields.priority?.name || 'Media',
                    createdDate: new Date(fields.created),
                    year: new Date(fields.created).getFullYear(),
                    month: new Date(fields.created).getMonth() + 1,
                    originalEstimate: fields.timeoriginalestimate ? fields.timeoriginalestimate / 3600 : null,
                    reporter: 'Jira Sync'
                }
            });
            upsertedCount++;
        }

        // Log successful sync
        await prisma.importLog.create({
            data: {
                type: 'EVOLUTIVOS_SYNC',
                status: 'SUCCESS',
                filename: `evolutivos_sync_${new Date().toISOString().split('T')[0]}`,
                totalRows: allIssues.length,
                processedCount: upsertedCount,
                errors: JSON.stringify({
                    evolutivos: evolutivos.length,
                    hitos: hitos.length,
                    projects: projectKeys,
                    executionTime: Date.now() - startTime
                }),
                date: new Date()
            }
        });

        revalidatePath("/dashboard/evolutivos");
        return { success: true, message: `Sincronizados ${upsertedCount} tickets evolutivos e hitos`, error: undefined };
    } catch (error: any) {
        console.error("Error in syncTotalEvolutivos:", error);

        // Log failed sync
        await prisma.importLog.create({
            data: {
                type: 'EVOLUTIVOS_SYNC',
                status: 'ERROR',
                filename: `evolutivos_sync_FAILED_${new Date().toISOString().split('T')[0]}`,
                errors: JSON.stringify({
                    error: error.message,
                    projects: projectKeys,
                    executionTime: Date.now() - startTime
                }),
                date: new Date()
            }
        }).catch(() => { });

        return { success: false, error: error.message, message: undefined };
    }
}

export async function getClientsWithEvolutivos() {
    try {
        const filter = await getVisibilityFilter();
        const where: any = {};

        if (!filter.isGlobal) {
            where.OR = [];
            if (filter.clientIds) {
                where.OR.push({ id: { in: filter.clientIds } });
            }
            if (filter.managerId) {
                where.OR.push({ manager: filter.managerId });
            }
            if (where.OR.length === 0) return [];
        }

        return await prisma.client.findMany({
            where,
            select: { id: true, name: true, jiraProjectKey: true, portalUrl: true } as any,
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error("Error in getClientsWithEvolutivos:", error);
        return [];
    }
}
