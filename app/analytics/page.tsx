import { AdminSidebar } from "@/app/admin/components/sidebar";
import { SharedHeader } from "@/app/components/shared-header";
import { getTranslations } from "@/lib/get-translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

export default async function AnalyticsPage() {
    const session = await getAuthSession();
    const isAdmin = session?.userRole === 'ADMIN';
    const { t } = await getTranslations();

    const reports = [
        {
            title: t("admin.analytics.contractValidity"),
            description: t("admin.analytics.contractValidityDesc") || "Estado de validez y condiciones de los contratos de todos los Work Packages.",
            href: "/analytics/contract-validity",
            icon: FileText,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            permission: "view_analytics_contracts"
        },
        {
            title: t("admin.analytics.wpAccumulatedConsumption"),
            description: t("admin.analytics.wpAccumulatedConsumptionDesc"),
            href: "/analytics/wp-accumulated-consumption",
            icon: BarChart3,
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            permission: "view_analytics_wp_consumption"
        },
        {
            title: "Cuadro de Mando de AM",
            description: "Seguimiento anual de gestión operativa: Evolutivos, entregas en PRO y propuestas.",
            href: "/analytics/am-dashboard",
            icon: Activity,
            color: "text-amber-500",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            permission: "view_analytics_am_dashboard"
        },
        {
            title: "Desvío de Vencimiento de Tareas Evolutivas",
            description: "Control y seguimiento de desviaciones entre fechas planificadas y reales de hitos AMA.",
            href: "/analytics/ama-desviaciones",
            icon: BarChart3,
            color: "text-purple-500",
            bg: "bg-purple-50 dark:bg-purple-900/20",
            permission: "view_analytics_ama_deviations"
        },
        {
            title: "Informe Anual AM",
            description: "Visión global del año: volumen de incidencias, cumplimiento de SLA, análisis de clientes y calidad de servicio.",
            href: "/analytics/annual-report",
            icon: BarChart3,
            color: "text-rose-500",
            bg: "bg-rose-50 dark:bg-rose-900/20",
            permission: "view_analytics_annual_report"
        }
    ];

    // Filter reports based on permissions
    const { hasPermission } = await import("@/lib/permissions");
    const visibleReports = [];

    for (const report of reports) {
        if (isAdmin || await hasPermission(session?.userRole || '', report.permission)) {
            visibleReports.push(report);
        }
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {isAdmin && <AdminSidebar />}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <SharedHeader title="Analytics" />
                <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    <div className="max-w-5xl mx-auto">
                        <header className="mb-10">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Informes de Negocio</h1>
                            <p className="text-slate-500 dark:text-slate-400">Seleccione un informe para visualizar los datos detallados.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {visibleReports.map((report) => (
                                <Link key={report.href} href={report.href}>
                                    <Card className="hover:shadow-lg transition-all cursor-pointer group border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 h-full">
                                        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                                            <div className={`p-3 rounded-xl ${report.bg} ${report.color} mr-4 transition-transform group-hover:scale-110`}>
                                                <report.icon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {report.title}
                                                </CardTitle>
                                            </div>
                                            <ArrowRight className="text-slate-300 group-hover:text-slate-500 transition-colors" size={20} />
                                        </CardHeader>
                                        <CardContent>
                                            <CardDescription className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                                {report.description}
                                            </CardDescription>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
