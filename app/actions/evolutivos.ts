"use server";

import { prisma } from "@/lib/prisma";
import { fetchJira } from "@/lib/jira";
import { fetchTempo } from "@/lib/tempo";
import { revalidatePath } from "next/cache";

// Sync constant for Evolutivo issue types
const EVOLUTIVO_TYPES = ["Evolutivo", "Hitos Evolutivos"];
const EVOLUTIVO_BILLING_MODES = ["T&M contra bolsa", "Bolsa de Horas", "T&M Facturable", "Facturable"];

export async function getEvolutivosByClient(clientId: string) {
    try {
        // Find all work packages for this client
        const workPackages = await prisma.workPackage.findMany({
            where: { clientId },
            select: { id: true, name: true }
        });

        const wpIds = workPackages.map(wp => wp.id);

        // Find all Evolutivos (no status filter - show all)
        const evolutivos = await (prisma.ticket as any).findMany({
            where: {
                workPackageId: { in: wpIds },
                issueType: 'Evolutivo',
                billingMode: { in: EVOLUTIVO_BILLING_MODES }
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
            const isBolsaOrFacturable = evo.billingMode === "Bolsa de Horas" || evo.billingMode === "Facturable";

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
            workPackages
        };
    } catch (error) {
        console.error("Error in getEvolutivosByClient:", error);
        return { evolutivos: [], hitos: [], workPackages: [] };
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
        // We need to find the internal Jira Issue ID for this key first, or search by key if supported
        // Tempo v4 /worklogs/search supports issueId or JQL (via some interpretations)
        // Let's use a simple search by issue key if we can, or just fetch and filter.

        // Step 1: Get Issue ID from Jira
        const jiraIssue = await fetchJira(`/issue/${issueKey}?fields=id`);
        const issueId = parseInt(jiraIssue.id);

        if (!issueId) return 0;

        const tempoRes = await fetchTempo("/worklogs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                issueId: [issueId],
                from: "2020-01-01", // Sufficiently back in time
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

export async function syncTotalEvolutivos(managerId?: string) {
    try {
        const where: any = {};
        if (managerId) {
            where.manager = managerId;
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
        return { success: false, error: error.message };
    }
}

export async function syncClientEvolutivos(clientId: string) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: { workPackages: true }
        });

        if (!client) return { success: false, message: "Cliente no encontrado" };

        const keys = client.workPackages
            .map(wp => wp.jiraProjectKeys)
            .join(',')
            .split(',')
            .map(k => k.trim())
            .filter(Boolean);

        const projectKeys = Array.from(new Set(keys));

        if (projectKeys.length === 0) return { success: false, message: "Este cliente no tiene claves de proyecto JIRA asociadas" };

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
        return { success: false, error: error.message };
    }
}

async function syncEvolutivosByProjectKeys(projectKeys: string[]) {
    try {
        if (projectKeys.length === 0) return { success: false, message: "No hay proyectos que sincronizar" };

        // 2. Jira Search for Evolutivos and Hitos
        // IMPORTANT: This JQL is for MANAGEMENT VIEW, not consumption calculation
        // We want to show ALL Evolutivos regardless of billing mode
        const projectList = projectKeys.join(',');
        const jql = `project IN (${projectList}) AND issuetype IN ("Evolutivo", "Hitos Evolutivos") ORDER BY created DESC`;

        const jiraRes = await fetchJira(`/search/jql`, {
            method: "POST",
            body: JSON.stringify({
                jql,
                maxResults: 1000,
                fields: ['key', 'summary', 'status', 'issuetype', 'assignee', 'duedate', 'parent', 'customfield_10121', 'created', 'timeoriginalestimate', 'priority']
            })
        });

        console.log(`[EVOLUTIVOS SYNC] Jira returned ${jiraRes.issues?.length || 0} issues (total: ${jiraRes.total || 'unknown'})`);
        if (jiraRes.total && jiraRes.total > (jiraRes.issues?.length || 0)) {
            console.log(`[EVOLUTIVOS SYNC] ⚠️ WARNING: ${jiraRes.total - (jiraRes.issues?.length || 0)} issues not fetched due to pagination limit`);
        }

        if (!jiraRes.issues) return { success: false, message: "No se encontraron tickets en JIRA" };

        let upsertedCount = 0;
        for (const issue of jiraRes.issues) {
            const fields = issue.fields;
            const issueType = fields.issuetype?.name;
            const billingModeRaw = fields.customfield_10121;
            const billingMode = (typeof billingModeRaw === 'object' ? billingModeRaw?.value : billingModeRaw) || null;
            const parentKey = fields.parent?.key || null;

            // Find matching Work Package (first one that matches project key)
            const projectKey = issue.key.split('-')[0];
            const wp = await prisma.workPackage.findFirst({
                where: { jiraProjectKeys: { contains: projectKey } }
            });

            if (!wp) {
                console.log(`[SYNC] Skipping ${issue.key} - no WP found for project ${projectKey}`);
                continue;
            }

            console.log(`[SYNC] Processing ${issue.key} (${issueType}) for WP ${wp.id}`);
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
                    reporter: 'Jira Sync' // Adding required field or default
                }
            });
            upsertedCount++;
        }

        revalidatePath("/dashboard/evolutivos");
        return { success: true, message: `Sincronizados ${upsertedCount} tickets evolutivos e hitos` };
    } catch (error: any) {
        console.error("Error in syncTotalEvolutivos:", error);
        return { success: false, error: error.message };
    }
}

export async function getClientsWithEvolutivos(managerId?: string) {
    try {
        const where: any = {};
        if (managerId) {
            where.manager = managerId;
        }
        // Return all clients to allow sync or selection even if they don't have evolutivos yet
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
