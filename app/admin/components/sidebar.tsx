import { Users, Briefcase, Settings, FileInput, UserCog, ArrowLeftRight, Shield, Clock, BookOpen, Activity, Database, Calendar } from "lucide-react";
import { SidebarLink } from "./sidebar-link";
import { cookies } from "next/headers";
import { getPermissionsByRoleName } from "@/lib/permissions";

export async function AdminSidebar() {
    const userRole = cookies().get("user_role")?.value || "";
    const perms = await getPermissionsByRoleName(userRole);

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl hidden md:block pt-4 text-dark-green">
            <nav className="mt-4 px-4 space-y-2">
                {perms.manage_clients && (
                    <SidebarLink href="/admin/clients" label="Clientes">
                        <Users className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.manage_wps && (
                    <SidebarLink href="/admin/work-packages" label="Work Packages">
                        <Briefcase className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.manage_reviews && (
                    <SidebarLink href="/admin/review-requests" label="Reclamaciones">
                        <Clock className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.edit_billing && (
                    <SidebarLink href="/admin/regularizations" label="Regularizaciones">
                        <ArrowLeftRight className="h-4 w-4" />
                    </SidebarLink>
                )}

                {(perms.manage_wps || perms.manage_clients || perms.view_renewals) && (
                    <SidebarLink href="/admin/renewals" label="Renovaciones">
                        <Calendar className="h-4 w-4" />
                    </SidebarLink>
                )}

                <SidebarLink href="/admin/import" label="Importar / Exportar">
                    <FileInput className="h-4 w-4" />
                </SidebarLink>

                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    {perms.manage_users && (
                        <SidebarLink href="/admin/users" label="Usuarios">
                            <UserCog className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    {perms.manage_roles && (
                        <SidebarLink href="/admin/roles" label="Roles">
                            <Shield className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    <SidebarLink href="/admin/settings" label="Configuración">
                        <Settings className="h-4 w-4" />
                    </SidebarLink>

                    <SidebarLink href="/admin/maintenance" label="Mantenimiento BBDD">
                        <Database className="h-4 w-4" />
                    </SidebarLink>

                    <SidebarLink href="/admin/settings/sync-debug" label="Diagnóstico Sync">
                        <Activity className="h-4 w-4" />
                    </SidebarLink>

                    <div className="pt-2">
                        <SidebarLink href="/help" label="Documentación">
                            <BookOpen className="h-4 w-4" />
                        </SidebarLink>
                    </div>
                </div>
            </nav>
        </aside>
    );
}
