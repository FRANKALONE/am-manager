"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTranslations } from "@/lib/get-translations";

export async function syncEvolutivoProposals(clientId?: string) {
    const { t } = await getTranslations();
    const https = require('https');

    try {
        // 1. Get clients and their project keys
        const clients = await prisma.client.findMany({
            where: clientId ? { id: clientId } : {
                jiraProjectKey: { not: null }
            },
            select: {
                id: true,
                jiraProjectKey: true,
                workPackages: {
                    select: {
                        jiraProjectKeys: true
                    }
                }
            }
        });

        if (clients.length === 0) {
            return { success: true, message: "No hay clientes con proyectos JIRA configurados.", count: 0 };
        }

        let totalSynced = 0;
        const jiraUrl = process.env.JIRA_URL?.trim();
        const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
        const jiraToken = process.env.JIRA_API_TOKEN?.trim();
        const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

        for (const client of clients) {
            // Collect all project keys for this client
            const projectKeys = new Set<string>();
            if (client.jiraProjectKey) projectKeys.add(client.jiraProjectKey);
            client.workPackages.forEach(wp => {
                if (wp.jiraProjectKeys) {
                    wp.jiraProjectKeys.split(',').map(k => k.trim()).filter(Boolean).forEach(k => projectKeys.add(k));
                }
            });

            if (projectKeys.size === 0) continue;

            const projectList = Array.from(projectKeys).join(',');
            const jql = `project IN (${projectList}) AND issuetype = "Petición de Evolutivo"`;

            const bodyData = JSON.stringify({
                jql,
                maxResults: 1000,
                fields: ['key', 'summary', 'status', 'created', 'assignee', 'reporter', 'components', 'priority', 'resolution', 'issuelinks']
            });

            const proposalsRes: any = await new Promise((resolve) => {
                const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                }, (res: any) => {
                    let data = '';
                    res.on('data', (c: any) => data += c);
                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) resolve(JSON.parse(data));
                            else resolve({ issues: [] });
                        } catch (e) { resolve({ issues: [] }); }
                    });
                });
                req.on('error', () => resolve({ issues: [] }));
                req.write(bodyData);
                req.end();
            });

            if (proposalsRes.issues && proposalsRes.issues.length > 0) {
                // Collect all related ticket keys to fetch their creation dates if needed
                const relatedKeysToFetch = new Set<string>();
                proposalsRes.issues.forEach((issue: any) => {
                    const links = issue.fields.issuelinks || [];
                    links.forEach((link: any) => {
                        const linkedIssue = link.outwardIssue || link.inwardIssue;
                        if (linkedIssue) relatedKeysToFetch.add(linkedIssue.key);
                    });
                });

                // Fetch creation dates for related issues
                const relatedIssueDates = new Map<string, string>();
                if (relatedKeysToFetch.size > 0) {
                    const relatedJql = `key IN (${Array.from(relatedKeysToFetch).map(k => `"${k}"`).join(',')})`;
                    const relatedBody = JSON.stringify({
                        jql: relatedJql,
                        fields: ['created']
                    });

                    const relatedRes: any = await new Promise((resolve) => {
                        const req = https.request(`${jiraUrl}/rest/api/3/search/jql`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'Content-Type': 'application/json'
                            }
                        }, (res: any) => {
                            let data = '';
                            res.on('data', (c: any) => data += c);
                            res.on('end', () => {
                                try {
                                    if (res.statusCode === 200) resolve(JSON.parse(data));
                                    else resolve({ issues: [] });
                                } catch (e) { resolve({ issues: [] }); }
                            });
                        });
                        req.on('error', () => resolve({ issues: [] }));
                        req.write(relatedBody);
                        req.end();
                    });

                    if (relatedRes.issues) {
                        relatedRes.issues.forEach((ri: any) => {
                            relatedIssueDates.set(ri.key, ri.fields.created);
                        });
                    }
                }

                for (const issue of proposalsRes.issues) {
                    const fields = issue.fields;
                    const links = fields.issuelinks || [];
                    const relatedTickets = links.map((link: any) => {
                        const linkedIssue = link.outwardIssue || link.inwardIssue;
                        if (!linkedIssue) return null;
                        return {
                            key: linkedIssue.key,
                            created: relatedIssueDates.get(linkedIssue.key) || null
                        };
                    }).filter(Boolean);

                    await (prisma as any).evolutivoProposal.upsert({
                        where: { issueKey: issue.key },
                        create: {
                            clientId: client.id,
                            issueKey: issue.key,
                            issueSummary: fields.summary || '',
                            status: fields.status?.name || 'Unknown',
                            createdDate: new Date(fields.created),
                            assignee: fields.assignee?.displayName || null,
                            reporter: fields.reporter?.displayName || null,
                            components: fields.components?.map((c: any) => c.name).join(', ') || null,
                            priority: fields.priority?.name || null,
                            resolution: fields.resolution?.name || null,
                            relatedTickets: JSON.stringify(relatedTickets),
                            issueCreatedDate: new Date(fields.created)
                        },
                        update: {
                            issueSummary: fields.summary || '',
                            status: fields.status?.name || 'Unknown',
                            assignee: fields.assignee?.displayName || null,
                            reporter: fields.reporter?.displayName || null,
                            components: fields.components?.map((c: any) => c.name).join(', ') || null,
                            priority: fields.priority?.name || null,
                            resolution: fields.resolution?.name || null,
                            relatedTickets: JSON.stringify(relatedTickets),
                            lastSyncedAt: new Date()
                        }
                    });
                    totalSynced++;
                }
            }
        }

        revalidatePath("/admin/import");
        return { success: true, message: `Se han sincronizado ${totalSynced} peticiones de evolutivo.`, count: totalSynced };

    } catch (error: any) {
        console.error("Error syncing evolutivo proposals:", error);
        return { success: false, error: error.message || "Error desconocido" };
    }
}

export async function getEvolutivoProposals(filters?: { clientId?: string; status?: string }) {
    try {
        const where: any = {};
        if (filters?.clientId) where.clientId = filters.clientId;
        if (filters?.status) where.status = filters.status;

        return await (prisma as any).evolutivoProposal.findMany({
            where,
            orderBy: { createdDate: 'desc' },
            include: {
                client: {
                    select: { name: true }
                }
            }
        });
    } catch (error) {
        console.error("Error fetching evolutivo proposals:", error);
        return [];
    }
}
