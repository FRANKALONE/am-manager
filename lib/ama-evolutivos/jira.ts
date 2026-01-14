// lib/ama-evolutivos/jira.ts
// Cliente JIRA específico para el módulo AMA Evolutivos
// Busca en TODOS los proyectos de tipo Service Desk

const JIRA_DOMAIN = process.env.JIRA_URL || process.env.JIRA_DOMAIN || '';
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const EVOLUTIVO_TYPE = process.env.AMA_EVOLUTIVO_TYPE || 'Epic';
const HITO_TYPE = process.env.AMA_HITO_TYPE || 'Story';

const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

interface JiraSearchResponse {
    issues: any[];
    total: number;
    maxResults: number;
    startAt: number;
}

export async function searchJiraIssues(jql: string, fields: string[] = ['*all']): Promise<any[]> {
    const url = `${JIRA_DOMAIN}/rest/api/3/search`;
    const allIssues: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    try {
        while (true) {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jql,
                    startAt,
                    maxResults,
                    fields,
                }),
            });

            if (!response.ok) {
                throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
            }

            const data: JiraSearchResponse = await response.json();
            allIssues.push(...data.issues);

            if (allIssues.length >= data.total) {
                break;
            }

            startAt += maxResults;
        }

        return allIssues;
    } catch (error) {
        console.error('Error searching JIRA issues:', error);
        throw error;
    }
}

export async function getEvolutivos(): Promise<any[]> {
    // Buscar en TODOS los proyectos de tipo Service Desk, no solo en uno específico
    const jql = `type = "${EVOLUTIVO_TYPE}" AND project.type = "service_desk" ORDER BY created DESC`;

    try {
        const issues = await searchJiraIssues(jql, [
            'summary',
            'status',
            'assignee',
            'project',
            'customfield_10014', // Epic Link / Parent
            'timeoriginalestimate',
            'timespent',
            'created',
            'updated',
        ]);

        return issues;
    } catch (error) {
        console.error('Error fetching evolutivos:', error);
        return [];
    }
}

export async function getHitos(evolutivoKey?: string): Promise<any[]> {
    // Buscar en TODOS los proyectos de tipo Service Desk
    let jql = `type = "${HITO_TYPE}" AND project.type = "service_desk"`;

    if (evolutivoKey) {
        jql += ` AND parent = "${evolutivoKey}"`;
    }

    jql += ' ORDER BY duedate ASC';

    try {
        const issues = await searchJiraIssues(jql, [
            'summary',
            'status',
            'duedate',
            'assignee',
            'parent',
            'project',
            'created',
            'updated',
        ]);

        return issues;
    } catch (error) {
        console.error('Error fetching hitos:', error);
        return [];
    }
}

export async function getJiraUsers(): Promise<any[]> {
    const url = `${JIRA_DOMAIN}/rest/api/3/users/search?maxResults=1000`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
        }

        const users = await response.json();
        return users;
    } catch (error) {
        console.error('Error fetching JIRA users:', error);
        return [];
    }
}

export async function getIssueById(issueKey: string): Promise<any | null> {
    const url = `${JIRA_DOMAIN}/rest/api/3/issue/${issueKey}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
        }

        const issue = await response.json();
        return issue;
    } catch (error) {
        console.error(`Error fetching issue ${issueKey}:`, error);
        return null;
    }
}
