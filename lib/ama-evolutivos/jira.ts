// lib/ama-evolutivos/jira.ts
// Cliente JIRA específico para el módulo AMA Evolutivos
// Busca en TODOS los proyectos de tipo Service Desk

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || process.env.NEXT_PUBLIC_JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

// Definimos listas de posibles nombres para mayor robustez
const EVOLUTIVO_TYPES = ["Evolutivo", "Petición de Evolutivo", "Evolutivos"];
const HITO_TYPES = ["Hitos Evolutivos", "Hito Evolutivo", "Hito"];

function getAuthHeader() {
    return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
}

export async function searchJiraIssues(jql: string, fields: string[] = ['*all']): Promise<any[]> {
    const authHeader = getAuthHeader();
    // Asegurarse de que el dominio no termine en / y tenga protocolo
    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }
    const url = `${domain}/rest/api/3/search/jql`;
    const allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;
    const maxResults = 100;

    try {
        while (true) {
            const body: any = {
                jql,
                fields,
                maxResults,
            };

            if (nextPageToken) {
                body.nextPageToken = nextPageToken;
            }

            console.log(`[Jira Search] URL: ${url}`);
            console.log(`[Jira Search] Body: ${JSON.stringify(body)}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
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

            console.log(`[Jira Search] Page issues: ${issues.length}, Accumulated: ${allIssues.length}`);

            nextPageToken = data.nextPageToken;
            if (!nextPageToken) {
                break;
            }
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
                'Authorization': getAuthHeader(),
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
                'Authorization': getAuthHeader(),
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
