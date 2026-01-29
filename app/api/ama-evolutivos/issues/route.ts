import { NextResponse } from 'next/server';
import { getHitos, getEvolutivos, getIssuesByKeys } from '@/lib/ama-evolutivos/jira';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';
import { getAuthSession } from '@/lib/auth';
import { parseISO, isPast, isToday, isFuture, addDays, isBefore } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch specifically "Hitos Evolutivos" that are not closed.
        const hitos = await getHitos();

        // 2. Fetch metric: Total Active Evolutivos (Parent tickets)
        const evolutivos = await getEvolutivos();
        const activeEvolutivosCount = evolutivos.length;

        // 3. ENRICHMENT: Fetch Parent Details for "Gestor del ticket" (customfield_10254)
        const parentKeys = Array.from(new Set(hitos
            .filter((i: any) => i.fields.parent && i.fields.parent.key)
            .map((i: any) => i.fields.parent.key)
        )) as string[];

        const managerMap = new Map();

        if (parentKeys.length > 0) {
            try {
                // Use getIssuesByKeys to fetch parent details
                const parentsData = await getIssuesByKeys(parentKeys, ['customfield_10254', 'customfield_10002']);

                parentsData.forEach((p: any) => {
                    const gestor = p.fields.customfield_10254;
                    const orgs = p.fields.customfield_10002 || [];
                    const organization = orgs.length > 0 ? orgs[0].name : null;

                    managerMap.set(p.key, {
                        gestor: gestor ? {
                            id: gestor.accountId,
                            name: gestor.displayName,
                            avatarUrl: gestor.avatarUrls?.['48x48'] || null
                        } : null,
                        organization: organization
                    });
                });
            } catch (err) {
                console.error("Error fetching parents for enrichment:", err);
            }
        }

        // 4. Attach Manager to Issues & Bucket them
        const now = new Date();
        const nextWeek = addDays(now, 7);

        const expired: any[] = [];
        const today: any[] = [];
        const upcoming: any[] = [];
        const others: any[] = [];
        const unplanned: any[] = [];

        const processedIssues = hitos.map((issue: any) => {
            const pKey = issue.fields.parent?.key;
            const parentDetails = pKey ? managerMap.get(pKey) : null;

            // Re-map to our JiraIssue type
            return {
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status?.name || 'Unknown',
                issueType: issue.fields.issuetype?.name || 'Unknown',
                dueDate: issue.fields.duedate,
                gestor: parentDetails?.gestor || null,
                organization: parentDetails?.organization || null,
                parentKey: pKey,
                parent: pKey ? {
                    key: pKey,
                    summary: issue.fields.parent.fields?.summary || 'Sin Título'
                } : undefined,
                assignee: issue.fields.assignee ? {
                    id: issue.fields.assignee.accountId,
                    displayName: issue.fields.assignee.displayName,
                    avatarUrl: issue.fields.assignee.avatarUrls?.['48x48']
                } : undefined
            };
        });

        processedIssues.forEach((issue: any) => {
            const dueDateStr = issue.dueDate;
            if (!dueDateStr) {
                unplanned.push(issue);
                return;
            }

            const dueDate = parseISO(dueDateStr);

            if (isToday(dueDate)) {
                today.push(issue);
            } else if (isPast(dueDate)) {
                expired.push(issue);
            } else if (isFuture(dueDate) && isBefore(dueDate, nextWeek)) {
                upcoming.push(issue);
            } else {
                others.push(issue);
            }
        });

        // Collect all managers for filtering
        const managers = Array.from(managerMap.values())
            .filter(item => item.gestor)
            .map(item => item.gestor)
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        const response: DashboardData = {
            summary: {
                expired: expired.length,
                today: today.length,
                upcoming: upcoming.length,
                others: others.length,
                unplanned: unplanned.length,
                activeEvolutivos: activeEvolutivosCount
            },
            issues: {
                expired,
                today,
                upcoming,
                others,
                unplanned,
            },
            managers: managers as any[],
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
