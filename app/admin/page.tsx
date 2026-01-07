import { getClients } from "@/app/actions/clients";
import { getWorkPackages } from "@/app/actions/work-packages";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, BarChart3, RefreshCw, ShieldCheck, UserCheck, ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { getMe } from "@/app/actions/users";

export default async function AdminDashboardPage() {
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
            title: "Clientes Totales",
            value: clients.length,
            description: "Empresas registradas",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            link: "/admin/clients"
        },
        {
            title: "Work Packages",
            value: wps.length,
            description: "Servicios activos",
            icon: Briefcase,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            link: "/admin/work-packages"
        },
        {
            title: "Evolutivos",
            value: evolutivosCount,
            description: "Tickets de desarrollo",
            icon: BarChart3,
            color: "text-amber-600",
            bg: "bg-amber-50",
            link: "/evolutivos"
        },
        {
            title: "Usuarios App",
            value: usersCount,
            description: "Total de cuentas",
            icon: UserCheck,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            link: "/admin/users"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
                        <LayoutDashboard className="w-10 h-10 text-dark-green" />
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">
                        Bienvenido al Centro de Administración, <span className="text-slate-900">{user?.name}</span>
                    </p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo Administrador Principal</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Link key={i} href={stat.link}>
                        <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer overflow-hidden relative">
                            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-500`}>
                                <stat.icon className="w-20 h-20" />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">{stat.title}</CardTitle>
                                <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                                <p className="text-xs text-slate-400 font-medium">{stat.description}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Quick Actions & More Stats */}
            <div className="grid gap-8 md:grid-cols-3">
                {/* Synchronization Card */}
                <Card className="md:col-span-2 border-none shadow-2xl bg-gradient-to-br from-dark-green to-jade text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <RefreshCw className="w-48 h-48" />
                    </div>
                    <CardHeader className="relative">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                            <RefreshCw className="w-6 h-6" />
                            Sincronización de Datos
                        </CardTitle>
                        <CardDescription className="text-jade-foreground/80 text-white/70">
                            Mantén el sistema actualizado con los últimos datos de JIRA y Tempo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative space-y-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Peticiones Pendientes</p>
                                    <p className="text-2xl font-bold">{proposalsCount}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-white/50">Estado JIRA</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-malachite animate-pulse" />
                                        <p className="text-sm font-bold">Conectado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/admin/import" className="flex-1">
                                <Button className="w-full bg-white text-dark-green hover:bg-slate-100 font-bold h-12 gap-2 shadow-lg">
                                    Ir a Importaciones
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/jira-customers" className="flex-1">
                                <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 font-bold h-12">
                                    Usuarios JIRA
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings / Maintenance Card */}
                <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                        <ShieldCheck className="w-32 h-32" />
                    </div>
                    <CardHeader className="relative">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            Sistema y Seguridad
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                        <Link href="/admin/maintenance" className="block p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm">Mantenimiento</span>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Limpieza de logs y optimización</p>
                        </Link>
                        <Link href="/admin/settings" className="block p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm">Parametrización</span>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Variables globales y factores</p>
                        </Link>
                        <Link href="/admin/review-requests" className="block p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm">Solicitantes de Revisión</span>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Aprobación de devoluciones</p>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
