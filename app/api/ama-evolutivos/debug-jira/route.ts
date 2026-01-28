import { NextResponse } from 'next/server';
import { searchJiraIssues, HITO_TYPES } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || process.env.NEXT_PUBLIC_JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const envStatus = {
            JIRA_URL: !!process.env.JIRA_URL,
            JIRA_DOMAIN: !!process.env.JIRA_DOMAIN,
            JIRA_USER_EMAIL: !!process.env.JIRA_USER_EMAIL,
            JIRA_EMAIL: !!process.env.JIRA_EMAIL,
            JIRA_API_TOKEN: !!process.env.JIRA_API_TOKEN,
            JIRA_URL_VALUE: JIRA_DOMAIN,
            JIRA_EMAIL_VALUE: JIRA_EMAIL
        };

        /* Temporalmente comentamos los tipos para evitar carga extra
        const typesRes = await fetch(`${JIRA_DOMAIN}/rest/api/3/issuetype`, {
            headers: { 'Authorization': authHeader }
        });
        const types = await typesRes.json();
        */
        const types = 'Fetch temporary disabled';

        // 2. Fetch last 20 CLOSED Hitos specifically (Using projectType)
        const hitosStr = HITO_TYPES.map(t => `"${t}"`).join(', ');
        const closedHitosJql = `projectType = "service_desk" AND issuetype IN (${hitosStr}) AND statusCategory = done order by resolved desc`;
        const issues = await searchJiraIssues(closedHitosJql, ['issuetype', 'status', 'resolutiondate', 'resolved', 'project', 'customfield_10015', 'duedate'], 20);

        // 3. Count issues by type in that sample
        const typeCounts: Record<string, number> = {};
        issues.forEach((i: any) => {
            const type = i.fields.issuetype?.name || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return NextResponse.json({
            envStatus,
            diagnostics: "Focused on CLOSED Hitos",
            targetJQL: closedHitosJql,
            sampleSize: issues.length,
            sampleTypes: typeCounts,
            lastClosedHitos: issues.map((i: any) => ({
                key: i.key,
                project: i.fields.project?.key,
                type: i.fields.issuetype?.name,
                status: i.fields.status?.name,
                statusCategory: i.fields.status?.statusCategory?.key,
                resolved: i.fields.resolved,
                resolutionDate: i.fields.resolutiondate,
                plannedDate: i.fields.customfield_10015 || i.fields.duedate || 'MISSING'
            }))
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        });
    }
}
