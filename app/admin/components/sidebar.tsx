import { Users, Briefcase, Settings, FileInput, UserCog, ArrowLeftRight, Shield, Clock, BookOpen, Activity, Database, Calendar, Bell, LayoutDashboard, UserPlus, Mail } from "lucide-react";
import { SidebarLink } from "./sidebar-link";
import { cookies } from "next/headers";
import { getPermissionsByRoleName } from "@/lib/permissions";
import { getTranslations } from "@/lib/get-translations";

export async function AdminSidebar() {
    const userRole = cookies().get("user_role")?.value || "";
    const perms = await getPermissionsByRoleName(userRole);
    const { t } = await getTranslations();

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl hidden md:block pt-4 text-dark-green font-anek">
            <nav className="mt-4 px-4 space-y-2">
                <SidebarLink href="/admin" label={t('admin.dashboard.title')}>
                    <LayoutDashboard className="h-4 w-4" />
                </SidebarLink>

                <div className="h-4" /> {/* Spacer */}
                {perms.manage_clients && (
                    <SidebarLink href="/admin/clients" label={t('sidebar.clients')}>
                        <Users className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.manage_wps && (
                    <SidebarLink href="/admin/work-packages" label={t('sidebar.workPackages')}>
                        <Briefcase className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.manage_reviews && (
                    <SidebarLink href="/admin/review-requests" label={t('sidebar.claims')}>
                        <Clock className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.edit_billing && (
                    <SidebarLink href="/admin/regularizations" label={t('sidebar.regularizations')}>
                        <ArrowLeftRight className="h-4 w-4" />
                    </SidebarLink>
                )}

                {(perms.manage_wps || perms.manage_clients || perms.view_renewals) && (
                    <SidebarLink href="/admin/renewals" label={t('sidebar.renewals')}>
                        <Calendar className="h-4 w-4" />
                    </SidebarLink>
                )}

                <SidebarLink href="/admin/import" label={t('sidebar.importExport')}>
                    <FileInput className="h-4 w-4" />
                </SidebarLink>

                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    {perms.manage_users && (
                        <SidebarLink href="/admin/users" label={t('sidebar.users')}>
                            <UserCog className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    {perms.manage_jira_requests && (
                        <>
                            <SidebarLink href="/admin/jira-customers" label="Usuarios JIRA">
                                <Users className="h-4 w-4" />
                            </SidebarLink>
                            <SidebarLink href="/admin/jira-requests" label="Solicitudes JIRA">
                                <UserPlus className="h-4 w-4" />
                            </SidebarLink>
                        </>
                    )}
                    {perms.manage_roles && (
                        <SidebarLink href="/admin/roles" label={t('sidebar.roles')}>
                            <Shield className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    <SidebarLink href="/admin/settings" label={t('sidebar.settings')}>
                        <Settings className="h-4 w-4" />
                    </SidebarLink>

                    <SidebarLink href="/admin/notifications" label={t('sidebar.notifications')}>
                        <Bell className="h-4 w-4" />
                    </SidebarLink>
                    <SidebarLink href="/admin/emails" label={t('sidebar.emails')}>
                        <Mail className="h-4 w-4" />
                    </SidebarLink>
                    <SidebarLink href="/admin/maintenance" label={t('sidebar.maintenance')}>
                        <Database className="h-4 w-4" />
                    </SidebarLink>

                    <div className="pt-2">
                        <SidebarLink href="/help" label={t('sidebar.documentation')}>
                            <BookOpen className="h-4 w-4" />
                        </SidebarLink>
                    </div>
                </div>
            </nav>
        </aside>
    );
}
