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
    const url = `${jiraUrl}/rest/servicedeskapi/servicedesk`;

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
            console.error(`Error fetching service desks: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const serviceDesks = data.values || [];

        return serviceDesks.find((sd: JiraServiceDesk) => sd.projectKey === projectKey) || null;
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
