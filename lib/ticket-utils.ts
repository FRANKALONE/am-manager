/**
 * Utility functions for generating ticket links and IDs based on user role and client configuration
 */

// Mapping of project keys to their custom field IDs for client JIRA integration
export const CLIENT_JIRA_MAPPING = {
    FAI: { customFieldId: 'customfield_10353', clientName: 'FAIN' },
    MOL: { customFieldId: 'customfield_10176', clientName: 'MOLECOR' },
    UAX: { customFieldId: 'customfield_10851', clientName: 'UAX' },
} as const;

export type ClientProjectKey = keyof typeof CLIENT_JIRA_MAPPING;

/**
 * Check if a project belongs to a client with their own JIRA
 */
export function isClientWithOwnJira(projectKey: string): projectKey is ClientProjectKey {
    return projectKey in CLIENT_JIRA_MAPPING;
}

/**
 * Get the custom field ID for a given project key
 */
export function getCustomFieldForProject(projectKey: string): string | null {
    if (isClientWithOwnJira(projectKey)) {
        return CLIENT_JIRA_MAPPING[projectKey].customFieldId;
    }
    return null;
}

interface TicketLinkParams {
    issueKey: string;
    clientJiraId?: string | null;
    isAdmin: boolean;
    portalUrl?: string | null;
}

/**
 * Generate the appropriate URL for a ticket based on user role and ticket data
 * - Admin users always go to Altim JIRA
 * - Client users go to their portal URL
 */
export function getTicketUrl({ issueKey, clientJiraId, isAdmin, portalUrl }: TicketLinkParams): string | null {
    if (isAdmin) {
        return `https://altim.atlassian.net/browse/${issueKey}`;
    }

    if (!portalUrl) {
        return null;
    }

    // For client users, use clientJiraId if available, otherwise use issueKey
    const ticketId = clientJiraId || issueKey;
    return `${portalUrl}/browse/${ticketId}`;
}

/**
 * Get the display text for a ticket ID
 * - If clientJiraId exists, show both IDs: "CLIENT-123 (AM-456)"
 * - Otherwise, just show the Altim ticket ID: "AM-456"
 */
export function getTicketDisplayText({ issueKey, clientJiraId }: { issueKey: string; clientJiraId?: string | null }): string {
    if (clientJiraId) {
        return `${clientJiraId} (${issueKey})`;
    }
    return issueKey;
}

/**
 * Extract custom field value from JIRA issue fields
 */
export function extractClientJiraId(fields: any, projectKey: string): string | null {
    const customFieldId = getCustomFieldForProject(projectKey);
    if (!customFieldId) {
        return null;
    }

    const fieldValue = fields[customFieldId];

    // Handle different formats that JIRA might return
    if (typeof fieldValue === 'string') {
        return fieldValue || null;
    }

    if (fieldValue && typeof fieldValue === 'object') {
        return fieldValue.value || fieldValue.name || null;
    }

    return null;
}
