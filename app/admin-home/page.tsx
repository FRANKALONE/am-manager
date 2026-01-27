import { SharedHeader } from "@/app/components/shared-header";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, FileCheck, Settings, Calendar, LayoutDashboard, ArrowRight, Zap, Shield, Sparkles, Users, Activity, Brain } from "lucide-react";
import { getAuthSession, getEvolutivosUrl } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "@/lib/get-translations";
import { cn } from "@/lib/utils";

export default async function AdminHomePage() {
    const session = await getAuthSession();
    if (!session) redirect("/login");

    const perms = session.permissions;
    const { t } = await getTranslations();

    const evolutivosUrl = await getEvolutivosUrl();

    const options = [
        {
            title: t('adminHome.dashboardConsumptions'),
            description: t('adminHome.dashboardConsumptionsDesc'),
            icon: BarChart3,
            href: "/dashboard",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            gradient: "from-emerald-600 to-emerald-400",
            visible: perms.view_admin_dashboard || perms.view_manager_dashboard || perms.view_client_dashboard
        },
        {
            title: t('adminHome.evolutivosManagement'),
            description: t('adminHome.evolutivosManagementDesc'),
            icon: Calendar,
            href: evolutivosUrl,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            gradient: "from-orange-600 to-orange-400",
            visible: perms.view_evolutivos_admin || perms.view_evolutivos_client
        },
        {
            title: t('adminHome.evolutivosStandard'),
            description: t('adminHome.evolutivosStandardDesc'),
            icon: Calendar,
            href: "/evolutivos",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            gradient: "from-amber-600 to-amber-400",
            visible: perms.view_evolutivos_standard && !perms.view_evolutivos_admin
        },
        {
            title: t('adminHome.closuresManagement'),
            description: t('adminHome.closuresManagementDesc'),
            icon: FileCheck,
            href: "/cierres",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            gradient: "from-purple-600 to-indigo-400",
            visible: perms.view_cierres
        },
        {
            title: t('adminHome.analytics'),
            description: t('adminHome.analyticsDesc'),
            icon: BarChart3,
            href: "/analytics",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            gradient: "from-blue-600 to-blue-400",
            visible: perms.view_analytics || perms.view_analytics_contracts || perms.view_analytics_wp_consumption || perms.view_analytics_am_dashboard
        },
        {
            title: t('adminHome.administration'),
            description: t('adminHome.administrationDesc'),
            icon: Settings,
            href: "/admin",
            color: "text-slate-900",
            bg: "bg-slate-900/10",
            gradient: "from-slate-900 to-slate-700",
            visible: perms.manage_users || perms.manage_clients || perms.manage_wps || perms.manage_roles
        },
        {
            title: t('adminHome.capacityManagement'),
            description: t('adminHome.capacityManagementDesc'),
            icon: Activity,
            href: "/capacity",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            gradient: "from-rose-600 to-rose-400",
            visible: perms.manage_capacity
        },
        {
            title: t('adminHome.optimizationHub'),
            description: t('adminHome.optimizationHubDesc'),
            icon: Brain,
            href: "/optimization-hub",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            gradient: "from-indigo-600 to-indigo-400",
            visible: perms.view_optimization_hub || perms.view_manager_dashboard || session.userRole === 'ADMIN'
        }
    ].filter(o => o.visible);

    return (
        <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-blue-50/40 overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-[120px]" />

            <SharedHeader title={t('common.home')} />

            <div id="admin-home-container" className="relative max-w-7xl mx-auto py-20 px-8 z-10">
                <div className="mb-20 text-center animate-in fade-in slide-in-from-top-10 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-green/10 border border-dark-green/20 text-dark-green text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        Professional Suite
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6">
                        {t('adminHome.title')}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed">
                        {t('adminHome.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col gap-10 max-w-7xl mx-auto">
                    {/* Top Row: First 4 Cards */}
                    <div className={cn(
                        "grid grid-cols-1 gap-10 items-stretch",
                        options.slice(0, 4).length === 4 ? "lg:grid-cols-4" : `lg:grid-cols-${options.slice(0, 4).length}`,
                        options.slice(0, 4).length > 1 ? "md:grid-cols-2" : ""
                    )}>
                        {options.slice(0, 4).map((option, i) => (
                            <Link key={option.href} href={option.href} className="group outline-none h-full">
                                <Card className="h-full border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_45px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 hover:-translate-y-4 cursor-pointer bg-white/70 backdrop-blur-2xl ring-1 ring-slate-200/50 hover:ring-slate-300 relative overflow-hidden flex flex-col rounded-[2.5rem] group">
                                    {/* Large Decorative Icon */}
                                    <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.07] group-hover:rotate-12 group-hover:scale-150 transition-all duration-1000 text-slate-900">
                                        <option.icon className="w-48 h-48" />
                                    </div>

                                    <CardHeader className="p-10 pb-6 relative z-20">
                                        <div className={cn(
                                            "w-20 h-20 rounded-[1.75rem] flex items-center justify-center mb-10 transition-all duration-700 shadow-xl shadow-slate-200/50 group-hover:scale-110",
                                            option.bg
                                        )}>
                                            <div className={cn("p-4 rounded-2xl bg-white shadow-inner", option.color)}>
                                                <option.icon className="w-8 h-8" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-4 group-hover:text-dark-green transition-colors">
                                            {option.title}
                                        </CardTitle>
                                        <CardDescription className="text-lg text-slate-500 leading-relaxed font-medium">
                                            {option.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="p-10 pt-0 mt-auto relative z-20">
                                        <div className="pt-8 border-t border-slate-100/50 flex items-center justify-between">
                                            <div className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-2 transition-transform", option.color)}>
                                                {t('adminHome.accessModule')}
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                            <div className={cn("w-10 h-1 bg-gradient-to-r opacity-20 rounded-full", option.gradient)} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* Bottom Row: 5th Card (if exists) */}
                    {options.length > 4 && (
                        <div className="w-full flex flex-col gap-10">
                            {options.slice(4).map((option) => (
                                <Link key={option.href} href={option.href} className="group outline-none">
                                    <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_45px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 hover:-translate-y-2 cursor-pointer bg-white/70 backdrop-blur-2xl ring-1 ring-slate-200/50 hover:ring-slate-300 relative overflow-hidden flex flex-row items-center rounded-[2.5rem] group min-h-[160px]">
                                        {/* Large Decorative Icon */}
                                        <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.07] group-hover:rotate-12 group-hover:scale-150 transition-all duration-1000 text-slate-900">
                                            <option.icon className="w-48 h-48" />
                                        </div>

                                        <div className="p-10 flex flex-row items-center gap-10 w-full relative z-20">
                                            <div className={cn(
                                                "w-20 h-20 shrink-0 rounded-[1.75rem] flex items-center justify-center transition-all duration-700 shadow-xl shadow-slate-200/50 group-hover:scale-110",
                                                option.bg
                                            )}>
                                                <div className={cn("p-4 rounded-2xl bg-white shadow-inner", option.color)}>
                                                    <option.icon className="w-8 h-8" />
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <CardTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3 group-hover:text-dark-green transition-colors">
                                                    {option.title}
                                                </CardTitle>
                                                <CardDescription className="text-lg text-slate-500 leading-relaxed font-medium">
                                                    {option.description}
                                                </CardDescription>
                                            </div>

                                            <div className="flex flex-col items-end gap-3 shrink-0">
                                                <div className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-2 transition-transform", option.color)}>
                                                    {t('adminHome.accessModule')}
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                                <div className={cn("w-20 h-1 bg-gradient-to-r opacity-20 rounded-full", option.gradient)} />
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {options.length === 0 && (
                        <div className="col-span-full text-center p-20 bg-white/50 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-dashed border-slate-300">
                            <Shield className="w-20 h-20 text-slate-300 mx-auto mb-6" />
                            <p className="text-slate-500 text-2xl font-bold">{t('common.noPermissions')}</p>
                        </div>
                    )}
                </div>

                {/* Bottom Footer Info */}
                <div className="mt-24 text-center text-slate-400 font-medium text-sm opacity-70">
                    © {new Date().getFullYear()} Altim Tecnologías de la Información. {t('common.allRightsReserved')}.
                </div>
            </div>
        </div>
    );
}
