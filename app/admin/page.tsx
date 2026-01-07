import { getClients } from "@/app/actions/clients";
import { getWorkPackages } from "@/app/actions/work-packages";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, BarChart3, RefreshCw, ShieldCheck, UserCheck, ArrowRight, LayoutDashboard, Zap, Activity, Database, Settings } from "lucide-react";
import Link from "next/link";
import { getMe } from "@/app/actions/users";
import { getTranslations } from "@/lib/get-translations";

export default async function AdminDashboardPage() {
    const { t } = await getTranslations();
    const user = await getMe();
    const clients = await getClients();
    const wps = await getWorkPackages();
    const usersCount = await prisma.user.count();
    const evolutivosCount = await (prisma as any).ticket.count({
        where: { issueType: 'Evolutivo' }
    });
    const proposalsCount = await (prisma as any).evolutivoProposal.count();

    const stats = [
        {
            title: t('admin.dashboard.clients'),
            value: clients.length,
            description: t('admin.dashboard.clientsDesc'),
            icon: Users,
            color: "text-blue-600",
            iconColor: "blue",
            bg: "bg-blue-500/10",
            gradient: "from-blue-500 to-cyan-400",
            link: "/admin/clients"
        },
        {
            title: t('admin.dashboard.workPackages'),
            value: wps.length,
            description: t('admin.dashboard.workPackagesDesc'),
            icon: Briefcase,
            color: "text-emerald-600",
            iconColor: "emerald",
            bg: "bg-emerald-500/10",
            gradient: "from-emerald-600 to-teal-400",
            link: "/admin/work-packages"
        },
        {
            title: t('admin.dashboard.evolutivos'),
            value: evolutivosCount,
            description: t('admin.dashboard.evolutivosDesc'),
            icon: BarChart3,
            color: "text-amber-600",
            iconColor: "amber",
            bg: "bg-amber-500/10",
            gradient: "from-orange-500 to-amber-400",
            link: "/evolutivos"
        },
        {
            title: t('admin.dashboard.users'),
            value: usersCount,
            description: t('admin.dashboard.usersDesc'),
            icon: UserCheck,
            color: "text-indigo-600",
            iconColor: "indigo",
            bg: "bg-indigo-500/10",
            gradient: "from-indigo-600 to-purple-500",
            link: "/admin/users"
        }
    ];

    return (
        <div className="relative -m-8 p-8 min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-blue-50/30 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-jade/5 rounded-full blur-3xl" />

            <div className="relative space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/60 pb-10">
                    <div>
                        <div className="flex items-center gap-2 text-dark-green font-black text-xs uppercase tracking-[0.2em] mb-3">
                            <Activity className="w-4 h-4" />
                            System Overview
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-3 flex items-center gap-4">
                            <div className="p-3 bg-dark-green rounded-2xl shadow-xl shadow-dark-green/20">
                                <LayoutDashboard className="w-8 h-8 text-white" />
                            </div>
                            {t('admin.dashboard.title')}
                        </h1>
                        <p className="text-slate-500 text-xl font-medium max-w-2xl">
                            {t('admin.dashboard.subtitle', { name: user?.name || '' })}
                        </p>
                    </div>
                    <div className="group bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200/50 flex items-center gap-3 shadow-xl shadow-slate-200/40 hover:bg-white/80 transition-all duration-500">
                        <div className="relative">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
                            <div className="w-3 h-3 rounded-full bg-red-500 relative" />
                        </div>
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest">{t('admin.dashboard.adminMode')}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <Link key={i} href={stat.link} className="group outline-none">
                            <Card className="border-none shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer overflow-hidden relative bg-white/70 backdrop-blur-xl h-full flex flex-col group-hover:-translate-y-2 ring-1 ring-slate-200/50 group-hover:ring-slate-300">
                                <div className={`absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-150 transition-all duration-700 text-slate-900`}>
                                    <stat.icon className="w-32 h-32" />
                                </div>

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors">{stat.title}</CardTitle>
                                    <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-inner ring-1 ring-white/50`}>
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                </CardHeader>

                                <CardContent className="mt-auto">
                                    <div className="text-4xl font-black text-slate-900 mb-2 tracking-tighter tabular-nums drop-shadow-sm">{stat.value}</div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-1 rounded-full bg-gradient-to-r ${stat.gradient} opacity-60`} />
                                        <p className="text-xs text-slate-500 font-bold tracking-tight">{stat.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Quick Actions & More Stats */}
                <div className="grid gap-10 md:grid-cols-3 pt-4">
                    {/* Synchronization Card */}
                    <Card className="md:col-span-2 border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] bg-gradient-to-br from-dark-green via-dark-green to-jade text-white overflow-hidden relative min-h-[400px] flex flex-col group">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-1000">
                            <RefreshCw className="w-64 h-64" />
                        </div>
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

                        <CardHeader className="relative p-10">
                            <div className="bg-white/10 w-fit p-3 rounded-2xl mb-6 backdrop-blur-md ring-1 ring-white/20">
                                <Zap className="w-6 h-6 text-malachite" />
                            </div>
                            <CardTitle className="text-4xl font-black flex items-center gap-4 mb-3 tracking-tighter">
                                {t('admin.dashboard.syncTitle')}
                            </CardTitle>
                            <CardDescription className="text-white/70 text-lg font-medium max-w-md leading-relaxed">
                                {t('admin.dashboard.syncSubtitle')}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="relative p-10 pt-0 mt-auto space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl relative overflow-hidden group/item">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/item:scale-125 transition-transform">
                                        <Database className="w-12 h-12" />
                                    </div>
                                    <p className="text-[10px] uppercase font-black tracking-[0.25em] text-white/50 mb-2">{t('admin.dashboard.pendingProposals')}</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-5xl font-black tracking-tighter">{proposalsCount}</p>
                                        <span className="text-xs font-bold text-white/40 mb-2">items</span>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl relative overflow-hidden group/item">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/item:scale-125 transition-transform">
                                        <Activity className="w-12 h-12" />
                                    </div>
                                    <p className="text-[10px] uppercase font-black tracking-[0.25em] text-white/50 mb-2">{t('admin.dashboard.jiraStatus')}</p>
                                    <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-2xl border border-white/10 mt-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-malachite animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                        <p className="text-sm font-black tracking-widest">{t('admin.dashboard.connected')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6">
                                <Link href="/admin/import" className="flex-1">
                                    <Button className="w-full bg-white text-dark-green hover:bg-slate-100 font-black h-16 text-lg rounded-3xl gap-3 shadow-2xl shadow-black/20 group/btn transition-all duration-500">
                                        {t('admin.dashboard.goToImports')}
                                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="/admin/jira-customers" className="flex-1">
                                    <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 font-black h-16 text-lg rounded-3xl transition-all duration-500">
                                        {t('admin.dashboard.jiraUsers')}
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings / Maintenance Card */}
                    <div className="flex flex-col gap-8">
                        <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-xl overflow-hidden relative group p-1 flex-1 min-h-[300px] flex flex-col ring-1 ring-slate-200/50">
                            <CardHeader className="p-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                                        {t('admin.dashboard.securityTitle')}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-4 flex-1">
                                {[
                                    { href: "/admin/maintenance", label: t('admin.dashboard.maintenance'), desc: t('admin.dashboard.maintenanceDesc'), icon: Database, color: "blue" },
                                    { href: "/admin/settings", label: t('admin.dashboard.parametrization'), desc: t('admin.dashboard.parametrizationDesc'), icon: Settings, color: "indigo" },
                                    { href: "/admin/review-requests", label: t('admin.dashboard.reviewRequests'), desc: t('admin.dashboard.reviewRequestsDesc'), icon: UserCheck, color: "emerald" }
                                ].map((item, i) => (
                                    <Link key={i} href={item.href} className="group/item flex items-center justify-between p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-300 shadow-sm hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-slate-100 rounded-xl group-hover/item:bg-white transition-colors">
                                                <item.icon className="w-4 h-4 text-slate-400 group-hover/item:text-indigo-600" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm block text-slate-800 tracking-tight">{item.label}</span>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{item.desc}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                                    </Link>
                                ))}
                            </CardContent>
                            <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
