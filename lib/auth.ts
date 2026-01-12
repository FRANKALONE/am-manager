import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getPermissionsByRoleName } from "./permissions";

export interface AuthSession {
    userId: string;
    userRole: string;
    clientId?: string;
    permissions: Record<string, boolean>;
}

export interface VisibilityFilter {
    isGlobal: boolean;
    clientIds?: string[];
    wpIds?: string[];
    managerId?: string;
}

/**
 * Gets the current authenticated session from cookies
 */
export async function getAuthSession(): Promise<AuthSession | null> {
    const userId = cookies().get("user_id")?.value;
    const userRole = cookies().get("user_role")?.value;
    const clientId = cookies().get("client_id")?.value;

    if (!userId || !userRole) return null;

    const permissions = await getPermissionsByRoleName(userRole);

    return {
        userId,
        userRole,
        clientId,
        permissions
    };
}

/**
 * Gets the full user object for the current session
 */
export async function getCurrentUser() {
    const session = await getAuthSession();
    if (!session) return null;

    return await prisma.user.findUnique({
        where: { id: session.userId },
        include: { client: true }
    });
}

/**
 * Checks if the current user has a specific permission
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
    const session = await getAuthSession();
    if (!session) return false;

    // ADMIN always has all permissions
    if (session.userRole === 'ADMIN') return true;

    return !!session.permissions[permissionKey];
}

/**
 * Calculates the data visibility scope for the current user
 */
export async function getVisibilityFilter(): Promise<VisibilityFilter> {
    const session = await getAuthSession();
    if (!session) return { isGlobal: false, clientIds: [], wpIds: [] };

    // Admin or specific global permission
    if (session.userRole === 'ADMIN' || session.permissions.view_all_clients) {
        return { isGlobal: true };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId }
    });

    if (!user) return { isGlobal: false, clientIds: [], wpIds: [] };

    const clientIds: string[] = [];
    if (user.clientId) clientIds.push(user.clientId);

    let wpIds: string[] = [];
    if (user.workPackageIds) {
        try {
            wpIds = JSON.parse(user.workPackageIds);
            if (!Array.isArray(wpIds)) wpIds = [user.workPackageIds];
        } catch (e) {
            wpIds = user.workPackageIds.split(',').map(id => id.trim()).filter(Boolean);
        }
    }

    // For GERENTE role, we also check if they are the manager of any client
    const isManager = session.userRole === 'GERENTE';

    return {
        isGlobal: false,
        clientIds: clientIds.length > 0 ? clientIds : undefined,
        wpIds: wpIds.length > 0 ? wpIds : undefined,
        managerId: isManager ? user.id : undefined
    };
}

/**
 * Helper to check if a user can access a specific client
 */
export async function canAccessClient(clientId: string): Promise<boolean> {
    const filter = await getVisibilityFilter();
    if (filter.isGlobal) return true;

    if (filter.clientIds?.includes(clientId)) return true;

    if (filter.managerId) {
        const client = await prisma.client.findFirst({
            where: { id: clientId, manager: filter.managerId }
        });
        return !!client;
    }

    return false;
}

/**
 * Helper to check if a user can access a specific WP
 */
export async function canAccessWP(wpId: string): Promise<boolean> {
    const filter = await getVisibilityFilter();
    if (filter.isGlobal) return true;

    if (filter.wpIds?.includes(wpId)) return true;

    // A user can also access a WP if they can access the client it belongs to
    const wp = await prisma.workPackage.findUnique({
        where: { id: wpId },
        select: { clientId: true }
    });

    if (!wp) return false;

    return await canAccessClient(wp.clientId);
}

/**
 * Checks if the user should be redirected to a landing page
 */
export async function getLandingRedirect(userId: string, userRole: string): Promise<string | null> {
    try {
        const { getActiveLandingsForUser } = await import("@/app/actions/landings");
        const landings = await getActiveLandingsForUser(userId);
        const firstUnread = landings.find(l => l.isNew);
        if (firstUnread) {
            return `/landing/${firstUnread.slug}`;
        }
    } catch (e) {
        console.error("Error checking unread landings:", e);
    }
    return null;
}

/**
 * Helper to determine the home URL for the current user
 */
export async function getHomeUrl(): Promise<string> {
    const session = await getAuthSession();
    if (!session) return "/login";

    const landingRedirect = await getLandingRedirect(session.userId, session.userRole);
    if (landingRedirect) return landingRedirect;

    // Check specific dashboard permissions in priority order
    if (session.userRole === 'ADMIN' || session.permissions.view_admin_dashboard) return "/admin-home";
    if (session.permissions.view_manager_dashboard) return "/manager-dashboard";
    // Default to client dashboard for all other cases
    return "/client-dashboard";
}
