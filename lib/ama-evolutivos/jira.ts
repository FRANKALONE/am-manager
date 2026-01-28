// lib/ama-evolutivos/jira.ts
// Cliente JIRA específico para el módulo AMA Evolutivos
// Busca en TODOS los proyectos de tipo Service Desk

const JIRA_DOMAIN = (process.env.JIRA_URL || process.env.JIRA_DOMAIN || process.env.NEXT_PUBLIC_JIRA_DOMAIN || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';

// Definimos listas de posibles nombres para mayor robustez
export const EVOLUTIVO_TYPES = ["Evolutivo", "Petición de Evolutivo", "Evolutivos"];
export const HITO_TYPES = ["Hitos Evolutivos", "Hito Evolutivo", "Hito"];

function getAuthHeader() {
    return `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
}

export async function searchJiraIssues(jql: string, fields: string[] = ['*all'], maxIssues?: number): Promise<any[]> {
    const authHeader = getAuthHeader();
    // Asegurarse de que el dominio no termine en / y tenga protocolo
    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }
    const url = `${domain}/rest/api/3/search/jql`;
    const allIssues: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    try {
        while (true) {
            const params = new URLSearchParams({
                jql,
                startAt: startAt.toString(),
                maxResults: (maxIssues && maxIssues < maxResults ? maxIssues : maxResults).toString(),
            });

            // Añadir campos uno a uno si es necesario o como una cadena separada por comas
            if (fields && fields.length > 0) {
                params.append('fields', fields.join(','));
            }

            const searchUrl = `${url}?${params.toString()}`;

            console.log(`[Jira Search] URL: ${searchUrl}`);

            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`JIRA API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            const issues = data.issues || [];
            allIssues.push(...issues);

            console.log(`[Jira Search] Page issues: ${issues.length}, Accumulated: ${allIssues.length}, Total in JIRA: ${data.total}`);

            if (maxIssues && allIssues.length >= maxIssues) {
                break;
            }

            startAt += issues.length;
            if (issues.length === 0 || startAt >= (data.total || 0)) {
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
    const jql = `projectType = "service_desk" AND issuetype IN (${typesStr}) ORDER BY created DESC`;

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
    let jql = `projectType = "service_desk" AND issuetype IN (${typesStr}) AND status NOT IN ("Cerrado", "Done")`;

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
        const incidenciasJql = `projectType = "service_desk" AND issuetype IN ("Incidencia de Correctivo", "Consulta") AND status NOT IN ("Cerrado", "Propuesta de Solución", "Done")`;
        const evolutivosJql = `projectType = "service_desk" AND issuetype IN (${evoTypesStr}) AND status NOT IN ("Cerrado", "Done", "Entregado en PRO", "Entregado en PRO (Cloud)", "Entregado en PRD")`;

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

export async function getClosedHitos(startDate?: string, endDate?: string): Promise<any[]> {
    const typesStr = HITO_TYPES.map(t => `"${t}"`).join(', ');

    let jql = `projectType = "service_desk" AND issuetype IN (${typesStr}) AND statusCategory = done`;

    if (startDate && endDate) {
        jql += ` AND resolved >= "${startDate}" AND resolved <= "${endDate}"`;
    } else {
        jql += ` AND resolved >= "-730d"`;
    }

    // Solo traemos hitos que tengan fecha para poder calcular el desvío
    jql += ` AND (duedate is not EMPTY OR cf[10015] is not EMPTY) ORDER BY resolved DESC`;

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
            'customfield_10125', // Fecha FIN de replanificación
            'resolutiondate',
            'created',
            'updated',
            'resolved', // Agregamos 'resolved' explícitamente
            'customfield_10002', // Organization
        ], 5000);

        return issues;
    } catch (error) {
        console.error('Error fetching closed hitos:', error);
        return [];
    }
}

export async function getIssuesByKeys(keys: string[], fields: string[] = ['*all']): Promise<any[]> {
    if (keys.length === 0) return [];

    // Chunk keys to avoid too long JQL (max ~50-100 keys per request)
    const chunkSize = 50;
    const allResults: any[] = [];

    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        const jql = `key IN (${chunk.map(k => `"${k}"`).join(',')})`;
        try {
            const issues = await searchJiraIssues(jql, fields);
            allResults.push(...issues);
        } catch (error) {
            console.error(`Error fetching issues by keys chunk ${i}:`, error);
        }
    }

    return allResults;
}
