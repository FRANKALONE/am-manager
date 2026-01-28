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

        // 2. Fetch specific years to see why 2025 is missing
        const hitosStr = (HITO_TYPES as string[]).map(t => `"${t}"`).join(', ');

        // Deep dive 2025
        const jql2025 = `projectType = "service_desk" AND issuetype IN (${hitosStr}) AND statusCategory = done AND resolved >= "2025-01-01" AND resolved <= "2025-12-31" order by resolved desc`;
        const issues2025 = await searchJiraIssues(jql2025, ['issuetype', 'status', 'resolutiondate', 'resolved', 'project', 'customfield_10015', 'duedate'], 100);

        // General sample (to compare)
        const jqlGeneral = `projectType = "service_desk" AND issuetype IN (${hitosStr}) AND statusCategory = done order by resolved desc`;
        const issuesGeneral = await searchJiraIssues(jqlGeneral, ['issuetype', 'status', 'resolutiondate', 'resolved', 'project'], 50);

        const yearCounts: Record<number, number> = {};
        issuesGeneral.forEach((i: any) => {
            const resDate = i.fields.resolutiondate || i.fields.resolved;
            if (resDate) {
                const year = new Date(resDate).getFullYear();
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            }
        });

        return NextResponse.json({
            envStatus,
            diagnostics: "FOCUSED ON 2025 DEEP DIVE",
            yearDistributionInGeneralSample: yearCounts,
            results2025: {
                jql: jql2025,
                countFound: issues2025.length,
                samples: issues2025.slice(0, 50).map((i: any) => ({
                    key: i.key,
                    project: i.fields.project?.key,
                    status: i.fields.status?.name,
                    resolved: i.fields.resolved || i.fields.resolutiondate,
                    plannedDate: i.fields.customfield_10015 || 'MISSING',
                    dueDate: i.fields.duedate || 'MISSING'
                }))
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        });
    }
}
