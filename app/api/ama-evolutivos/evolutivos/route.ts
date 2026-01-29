import { NextResponse } from 'next/server';
import { getEvolutivos, getHitos } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';
import { parseISO, compareAsc } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const includeChildren = searchParams.get('includeChildren') === 'true';

    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch All Active Evolutivos (Parents)
        const parents = await getEvolutivos();

        if (parents.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch All Open Hitos linked to these parents
        const allHitos = await getHitos();

        // 3. Map Hitos to Parents
        const hitosByParent: Record<string, any[]> = {};
        allHitos.forEach((hito: any) => {
            const pKey = hito.fields.parent?.key;
            if (pKey) {
                if (!hitosByParent[pKey]) hitosByParent[pKey] = [];
                hitosByParent[pKey].push(hito);
            }
        });

        // 4. Enrich & Calculate Sorting Key
        const EXCLUDED_BILLING_MODES = ['T&M facturable', 'T&M contra bolsa'];

        const enrichedList = parents.map((parent: any) => {
            const children = hitosByParent[parent.key] || [];

            // "Active" children for date calculation (User specific: "not equal to Cerrado")
            const activeChildren = children.filter((c: any) =>
                c.fields.status?.name !== 'Cerrado'
            );

            // Find "Latest" due date among OPEN children
            let latestDateObj: Date | null = null;
            let latestDateStr: string | null = null;

            activeChildren.forEach((child: any) => {
                const dStr = child.fields.duedate;
                if (dStr) {
                    const d = parseISO(dStr);
                    if (!latestDateObj || d > latestDateObj) {
                        latestDateObj = d;
                        latestDateStr = dStr;
                    }
                }
            });

            // Gestor extraction
            const gestorField = parent.fields.customfield_10254;
            const gestor = gestorField ? {
                name: gestorField.displayName,
                avatarUrl: gestorField.avatarUrls?.['48x48'],
                id: gestorField.accountId
            } : null;

            // Organization extraction
            const orgField = parent.fields.customfield_10002;
            const organization = orgField && orgField.length > 0 ? orgField[0].name : null;

            // Billing Mode extraction (customfield_10121)
            const billingField = parent.fields.customfield_10121;
            const billingMode = billingField?.value || null;

            const isUnplanned = activeChildren.length === 0;

            // FILTER: If Unplanned AND Billing Mode is Excluded -> Return null (to filter later)
            if (isUnplanned && EXCLUDED_BILLING_MODES.includes(billingMode)) {
                return null;
            }

            return {
                id: parent.id,
                key: parent.key,
                url: `${process.env.JIRA_URL || process.env.JIRA_DOMAIN || ''}/browse/${parent.key}`,
                summary: parent.fields.summary,
                status: parent.fields.status.name,
                assignee: parent.fields.assignee ? {
                    id: parent.fields.assignee.accountId,
                    displayName: parent.fields.assignee.displayName,
                    avatarUrl: parent.fields.assignee.avatarUrls?.['48x48']
                } : null,
                gestor,
                organization,
                billingMode,
                timeoriginalestimate: parent.fields.timeoriginalestimate,
                timespent: parent.fields.timespent,
                project: parent.fields.project.name,
                totalHitos: children.length,
                pendingHitos: activeChildren.length,
                latestDeadline: latestDateStr,
                latestDeadlineObj: latestDateObj,
                parentDeadline: parent.fields.duedate || null,
                children: includeChildren ? children : undefined
            };
        }).filter(Boolean);

        // 5. Sort
        enrichedList.sort((a: any, b: any) => {
            if (a.totalHitos === 0 && b.totalHitos > 0) return -1;
            if (a.totalHitos > 0 && b.totalHitos === 0) return 1;

            const getDate = (item: any) => item.latestDeadlineObj || (item.parentDeadline ? parseISO(item.parentDeadline) : null);

            const dateA = getDate(a);
            const dateB = getDate(b);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return compareAsc(dateA, dateB);
        });

        return NextResponse.json(enrichedList);

    } catch (error: any) {
        console.error("Evolutivos API Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
