import { Users, Briefcase, Settings, FileInput, UserCog, ArrowLeftRight, Shield, Clock, BookOpen, Activity, Database, Calendar, Bell, LayoutDashboard, UserPlus, Mail, Globe, Send, History, Layout, Brain, TrendingUp } from "lucide-react";
import { SidebarLink } from "./sidebar-link";
import { getAuthSession } from "@/lib/auth";
import { getTranslations } from "@/lib/get-translations";

export async function AdminSidebar() {
    const session = await getAuthSession();
    if (!session) return null;

    const perms = session.permissions;
    const { t } = await getTranslations();

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl hidden md:block pt-4 text-dark-green font-anek">
            <nav className="mt-4 px-4 space-y-2">
                <SidebarLink href="/admin" label={t('admin.dashboard.title')}>
                    <LayoutDashboard className="h-4 w-4" />
                </SidebarLink>

                {(perms.view_analytics || perms.view_analytics_contracts || perms.view_analytics_wp_consumption || perms.view_analytics_am_dashboard) && (
                    <SidebarLink href="/analytics" label="Analytics">
                        <TrendingUp className="h-4 w-4" />
                    </SidebarLink>
                )}

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

                {perms.edit_billing && (
                    <SidebarLink href="/admin/special-regularizations" label="Reg. Especiales">
                        <Activity className="h-4 w-4" />
                    </SidebarLink>
                )}

                {perms.manage_wps && (
                    <SidebarLink href="/admin/team-members" label="Equipo AM">
                        <Users className="h-4 w-4" />
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

                    <div className="h-2" />
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-1">Comunicaciones</div>
                    <SidebarLink href="/admin/notifications" label={t('sidebar.notifications')}>
                        <Bell className="h-4 w-4" />
                    </SidebarLink>
                    <SidebarLink href="/admin/emails" label={t('sidebar.emails')}>
                        <History className="h-4 w-4" />
                    </SidebarLink>
                    {perms.manage_mass_emails && (
                        <SidebarLink href="/admin/mass-emails" label="Emails Masivos">
                            <Send className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    {perms.manage_landings && (
                        <SidebarLink href="/admin/landings" label="Landing Pages">
                            <Layout className="h-4 w-4" />
                        </SidebarLink>
                    )}
                    <SidebarLink href="/admin/maintenance" label={t('sidebar.maintenance')}>
                        <Database className="h-4 w-4" />
                    </SidebarLink>
                </div>
            </nav>
        </aside >
    );
}
