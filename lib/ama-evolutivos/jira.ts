// lib/ama-evolutivos/jira.ts
// Cliente JIRA específico para el módulo AMA Evolutivos
// Busca en TODOS los proyectos de tipo Service Desk

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

// Definimos listas de posibles nombres para mayor robustez
const EVOLUTIVO_TYPES = ["Evolutivo", "Petición de Evolutivo", "Evolutivos"];
const HITO_TYPES = ["Hitos Evolutivos", "Hito Evolutivo", "Hito"];

const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

export async function searchJiraIssues(jql: string, fields: string[] = ['*all']): Promise<any[]> {
    // Asegurarse de que el dominio no termine en /
    const baseUrl = JIRA_DOMAIN.replace(/\/$/, '');
    const url = `${baseUrl}/rest/api/3/search`;
    const allIssues: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    try {
        while (true) {
            const body: any = {
                jql,
                startAt,
                maxResults,
                fields,
            };

            console.log(`[Jira Search] URL: ${url}`);
            console.log(`[Jira Search] JQL: ${jql}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`JIRA API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            const issues = data.issues || [];
            allIssues.push(...issues);

            const total = typeof data.total === 'number' ? data.total : allIssues.length;
            console.log(`[Jira Search] Page issues: ${issues.length}, Total in Jira: ${total}, Accumulated: ${allIssues.length}`);

            if (issues.length < maxResults || allIssues.length >= total) {
                break;
            }

            startAt += maxResults;
        }

        console.log(`[Jira Search] Final issues count: ${allIssues.length}`);
        return allIssues;
    } catch (error) {
        console.error('Error searching JIRA issues:', error);
        throw error;
    }
}

export async function getEvolutivos(): Promise<any[]> {
    const typesStr = EVOLUTIVO_TYPES.map(t => `"${t}"`).join(', ');
    const jql = `issuetype IN (${typesStr}) ORDER BY created DESC`;

    try {
        const issues = await searchJiraIssues(jql, [
            'summary',
            'status',
            'assignee',
            'project',
            'customfield_10014', // Epic Link / Parent
            'customfield_10254', // Gestor del ticket
            'customfield_10002', // Organization
            'customfield_10095', // Billing Mode
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
    const typesStr = HITO_TYPES.map(t => `"${t}"`).join(', ');
    let jql = `issuetype IN (${typesStr}) AND status NOT IN ("Cerrado", "Done")`;

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
            'customfield_10254', // Gestor del ticket
            'customfield_10015', // Fecha fin planificada
            'resolutiondate',
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

export async function getWorkloadMetrics(): Promise<{ incidencias: number; evolutivos: number }> {
    try {
        const evoTypesStr = EVOLUTIVO_TYPES.map(t => `"${t}"`).join(', ');
        const incidenciasJql = `issuetype IN ("Incidencia de Correctivo", "Consulta") AND status NOT IN ("Cerrado", "Propuesta de Solución", "Done")`;
        const evolutivosJql = `issuetype IN (${evoTypesStr}) AND status NOT IN ("Cerrado", "Done", "Entregado en PRO", "Entregado en PRO (Cloud)", "Entregado en PRD")`;

        const [incidenciasRes, evolutivosRes] = await Promise.all([
            searchJiraIssues(incidenciasJql, ['id']),
            searchJiraIssues(evolutivosJql, ['id'])
        ]);

        return {
            incidencias: incidenciasRes.length,
            evolutivos: evolutivosRes.length
        };
    } catch (error) {
        console.error('Error fetching workload metrics:', error);
        return { incidencias: 0, evolutivos: 0 };
    }
}

export async function getClosedHitos(monthsBack: number = 24): Promise<any[]> {
    const typesStr = HITO_TYPES.map(t => `"${t}"`).join(', ');
    const jql = `issuetype IN (${typesStr}) AND statusCategory = done AND resolved >= "-${monthsBack}m" ORDER BY resolved DESC`;

    try {
        const issues = await searchJiraIssues(jql, [
            'summary',
            'status',
            'duedate',
            'assignee',
            'parent',
            'project',
            'customfield_10254', // Gestor del ticket
            'customfield_10015', // Fecha fin planificada
            'resolutiondate',
            'created',
            'updated',
            'customfield_10002', // Organization
        ]);

        return issues;
    } catch (error) {
        console.error('Error fetching closed hitos:', error);
        return [];
    }
}
