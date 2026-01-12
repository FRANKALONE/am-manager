/**
 * Utilidades para interactuar con JIRA Service Management API
 * Gestión de organizaciones y usuarios de cliente
 */

interface JiraServiceDesk {
    id: string;
    projectKey: string;
    projectName: string;
}

interface JiraOrganization {
    id: string;
    name: string;
}

interface JiraCustomerUser {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    active: boolean;
    accountType?: string;
}

/**
 * Obtener Service Desk por clave de proyecto
 */
export async function getServiceDeskByProjectKey(projectKey: string): Promise<JiraServiceDesk | null> {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        throw new Error('JIRA credentials not configured');
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

    try {
        let allServiceDesks: JiraServiceDesk[] = [];
        let start = 0;
        const limit = 50;
        let isLast = false;

        // Paginar para obtener todos los Service Desks
        while (!isLast) {
            const url = `${jiraUrl}/rest/servicedeskapi/servicedesk?start=${start}&limit=${limit}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error(`Error fetching service desks: ${response.status}`);
                return null;
            }

            const data = await response.json();
            const serviceDesks = data.values || [];
            allServiceDesks = allServiceDesks.concat(serviceDesks);

            isLast = data.isLast || serviceDesks.length < limit;
            start += limit;

            // Límite de seguridad para evitar loops infinitos
            if (start > 1000) {
                console.warn('Reached safety limit of 1000 service desks');
                break;
            }
        }

        console.log(`Found ${allServiceDesks.length} service desks total`);
        const found = allServiceDesks.find((sd: JiraServiceDesk) => sd.projectKey === projectKey);

        if (!found) {
            console.log(`Service Desk with key ${projectKey} not found. Available keys:`,
                allServiceDesks.map(sd => sd.projectKey).join(', '));
        }

        return found || null;
    } catch (error) {
        console.error('Error fetching service desk:', error);
        return null;
    }
}

/**
 * Obtener organizaciones de un Service Desk
 */
export async function getOrganizationsByServiceDesk(serviceDeskId: string): Promise<JiraOrganization[]> {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        throw new Error('JIRA credentials not configured');
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/servicedesk/${serviceDeskId}/organization`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Error fetching organizations: ${response.status}`);
            return [];
        }

        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('Error fetching organizations:', error);
        return [];
    }
}

/**
 * Obtener usuarios de una organización
 */
export async function getUsersByOrganization(organizationId: string): Promise<JiraCustomerUser[]> {
    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        throw new Error('JIRA credentials not configured');
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/organization/${organizationId}/user?start=0&limit=1000`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Error fetching users: ${response.status}`);
            return [];
        }

        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

/**
 * Obtener URL del portal del cliente por clave de proyecto
 */
export async function getPortalUrlByProjectKey(projectKey: string): Promise<string | null> {

    const jiraUrl = process.env.JIRA_URL?.trim();
    const jiraEmail = process.env.JIRA_USER_EMAIL?.trim();
    const jiraToken = process.env.JIRA_API_TOKEN?.trim();

    if (!jiraUrl || !jiraEmail || !jiraToken) {
        throw new Error('JIRA credentials not configured');
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const url = `${jiraUrl}/rest/servicedeskapi/portals/project/${projectKey}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.log(`No portal found for project ${projectKey} (status ${response.status})`);
            return null;
        }

        const data = await response.json();

        // El endpoint devuelve información del portal
        // La URL del portal suele estar en _links.portalPage.href o similar
        // Formato típico: /servicedesk/customer/portal/1
        const portalId = data.id;
        if (portalId) {
            // Construir la URL completa del portal del cliente
            return `${jiraUrl}/servicedesk/customer/portal/${portalId}`;
        }

        return null;
    } catch (error) {
        console.error(`Error fetching portal URL for ${projectKey}:`, error);
        return null;
    }
}

