// lib/ama-evolutivos/jira.ts
// Cliente JIRA específico para el módulo AMA Evolutivos
// Busca en TODOS los proyectos de tipo Service Desk

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const EVOLUTIVO_TYPE = process.env.AMA_EVOLUTIVO_TYPE || 'Evolutivo';
const HITO_TYPE = process.env.AMA_HITO_TYPE || 'Hitos Evolutivos';

const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

export async function searchJiraIssues(jql: string, fields: string[] = ['*all']): Promise<any[]> {
    // Asegurarse de que el dominio no termine en /
    const baseUrl = JIRA_DOMAIN.replace(/\/$/, '');
    const url = `${baseUrl}/rest/api/3/search/jql`;
    const allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
        while (true) {
            const body: any = {
                jql,
                maxResults: 100,
                fields,
            };

            if (nextPageToken) {
                body.nextPageToken = nextPageToken;
            }

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

            nextPageToken = data.nextPageToken;

            if (!nextPageToken || issues.length === 0) {
                break;
            }
        }

        return allIssues;
    } catch (error) {
        console.error('Error searching JIRA issues:', error);
        throw error;
    }
}

export async function getEvolutivos(): Promise<any[]> {
    // Buscar en TODOS los proyectos de tipo Service Desk, no solo en uno específico
    const jql = `type = "${EVOLUTIVO_TYPE}" AND projectType = "service_desk" AND status NOT IN ("Cerrado", "Done") ORDER BY created DESC`;

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
    // Buscar en TODOS los proyectos de tipo Service Desk
    let jql = `type = "${HITO_TYPE}" AND projectType = "service_desk" AND status NOT IN ("Cerrado", "Done")`;

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
            'customfield_10015', // Fecha fin planificada (asumiendo este ID basado en patrones comunes)
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
        // 1. Incidencias de correctivo + Consultas (excluyendo Cerrados y Propuesta de Solución)
        const incidenciasJql = `type IN ("Incidencia de Correctivo", "Consulta") AND projectType = "service_desk" AND status NOT IN ("Cerrado", "Propuesta de Solución", "Done")`;

        // 2. Evolutivos abiertos (excluyendo Cerrados y Entregados en PRO/PRD)
        const evolutivosJql = `type = "${EVOLUTIVO_TYPE}" AND projectType = "service_desk" AND status NOT IN ("Cerrado", "Done", "Entregado en PRO", "Entregado en PRD")`;

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
    // Buscar hitos cerrados en los últimos X meses
    const jql = `type = "${HITO_TYPE}" AND status IN ("Cerrado", "Done") AND resolved >= "-${monthsBack}m" ORDER BY resolved DESC`;

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
            'customfield_10002', // Organization (del padre si no está aquí)
        ]);

        return issues;
    } catch (error) {
        console.error('Error fetching closed hitos:', error);
        return [];
    }
}
