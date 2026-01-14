// lib/ama-evolutivos/types.ts
// Tipos específicos para el módulo AMA Evolutivos

export interface JiraIssue {
    key: string;
    summary: string;
    status: string;
    issueType: string;
    dueDate?: string;
    gestor?: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    parentKey?: string;
    pendingHitos?: number;
    timeoriginalestimate?: number;
    timespent?: number;
    created?: string;
    updated?: string;
}

export interface JiraUser {
    id: string;
    name: string;
    displayName: string;
    avatarUrl?: string;
    emailAddress?: string;
}

export interface DashboardStats {
    expired: number;
    today: number;
    upcoming: number;
    others: number;
    unplanned: number;
    activeEvolutivos?: number;
}

export interface DashboardData {
    summary: DashboardStats;
    issues: {
        expired: JiraIssue[];
        today: JiraIssue[];
        upcoming: JiraIssue[];
        others: JiraIssue[];
        unplanned: JiraIssue[];
    };
    managers: JiraUser[];
}
