import { NextResponse } from 'next/server';
import { searchJiraIssues } from '@/lib/ama-evolutivos/jira';
import { getAuthSession } from '@/lib/auth';

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Fetch available issue types
        const typesRes = await fetch(`${JIRA_DOMAIN}/rest/api/3/issuetype`, {
            headers: { 'Authorization': authHeader }
        });
        const types = await typesRes.json();

        // 2. Fetch last 50 issues of any type to see what we have
        const issues = await searchJiraIssues('order by created desc', ['issuetype', 'status', 'resolutiondate', 'resolved', 'project']);

        // 3. Count issues by type in that sample
        const typeCounts: Record<string, number> = {};
        issues.forEach((i: any) => {
            const type = i.fields.issuetype?.name || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return NextResponse.json({
            types: Array.isArray(types) ? types.map((t: any) => ({ id: t.id, name: t.name })) : 'Failed to fetch types',
            sampleTypeStats: typeCounts,
            lastIssues: issues.slice(0, 20).map((i: any) => ({
                key: i.key,
                project: i.fields.project?.key,
                type: i.fields.issuetype?.name,
                status: i.fields.status?.name,
                resolved: i.fields.resolved,
                resolutionDate: i.fields.resolutiondate
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
