import { prisma } from "./prisma";

export async function getPermissionsByRoleName(roleName: string): Promise<Record<string, boolean>> {
    try {
        const role = await prisma.role.findUnique({
            where: { name: roleName }
        });

        if (!role || !role.permissions) return {};

        return JSON.parse(role.permissions);
    } catch (error) {
        console.error("Error fetching permissions for role:", roleName, error);
        return {};
    }
}

export async function hasPermission(roleName: string, permissionKey: string): Promise<boolean> {
    const permissions = await getPermissionsByRoleName(roleName);
    return !!permissions[permissionKey];
}
