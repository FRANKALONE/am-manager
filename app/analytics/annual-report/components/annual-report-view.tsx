'use client';

import React, { useState } from 'react';
import { AnnualReportData } from '@/app/actions/analytics-annual';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, CheckCircle, XCircle, Clock,
    AlertTriangle, Calendar, Filter, Download, ChevronRight,
    Search, BarChart3, Activity, Briefcase, UserPlus, ArrowUpRight,
    ClipboardList, PieChart as PieIcon, Calculator, ChevronDown, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface Props {
    report: AnnualReportData;
    year: number;
    clientId?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

export default function AnnualReportView({ report, year, clientId }: Props) {
    const router = useRouter();
    const formatNumber = (num: number) => Math.round(num).toLocaleString('es-ES');
    const formatPercent = (num: number) => `${num.toFixed(1)}%`;
    const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [showBacklogDetail, setShowBacklogDetail] = useState(false);
    const [selectedBacklogType, setSelectedBacklogType] = useState<string | null>(null);
    const [showClientsDetail, setShowClientsDetail] = useState(false);
    const [showEmployeesDetail, setShowEmployeesDetail] = useState(false);
    const [showContractTypesDetail, setShowContractTypesDetail] = useState(false);
    const [showHoursDetail, setShowHoursDetail] = useState(false);
    const [showIncidentsDetail, setShowIncidentsDetail] = useState(false);
    const [showSatisfactionDetail, setShowSatisfactionDetail] = useState(false);

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartData = report.monthly.map(m => ({
        ...m,
        name: months[m.month - 1]
    }));

    const updateFilters = (newYear?: string, newClientId?: string) => {
        const params = new URLSearchParams(window.location.search);
        if (newYear) params.set('year', newYear);
        if (newClientId !== undefined) {
            if (newClientId === 'all') params.delete('clientId');
            else params.set('clientId', newClientId);
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Filters Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2 uppercase">
                        <BarChart3 className="w-6 h-6 text-indigo-600" />
                        Informe Anual AM {year}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Análisis estratégico de operaciones, clientes y equipo
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select value={String(year)} onValueChange={(v) => updateFilters(v)}>
                        <SelectTrigger className="w-[120px] rounded-xl font-bold bg-slate-50 dark:bg-slate-800 border-none">
                            <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            {[2024, 2025, 2026].map(y => (
                                <SelectItem key={y} value={String(y)} className="font-medium">{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={clientId || "all"}
                        onValueChange={(v) => updateFilters(undefined, v)}
                    >
                        <SelectTrigger className="min-w-[200px] rounded-xl font-bold bg-slate-50 dark:bg-slate-800 border-none">
                            <Users className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Seleccionar Cliente" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            <SelectItem value="all" className="font-bold">Todos los Clientes</SelectItem>
                            {report.clients.newClients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                    {
                        title: "Clientes Totales",
                        value: formatNumber(report.clientsKPI.total),
                        sub: "Cartera gestionada",
                        icon: Users,
                        color: "text-indigo-600",
                        bg: "bg-indigo-50",
                        onClick: () => setShowClientsDetail(true)
                    },
                    {
                        title: "Equipo AM",
                        value: formatNumber(report.employeesKPI.total),
                        sub: `${report.employeesKPI.growthAbs >= 0 ? '+' : ''}${report.employeesKPI.growthAbs} miembros vs año anterior (${formatPercent(report.employeesKPI.growthRel)})`,
                        icon: UserPlus,
                        color: "text-violet-600",
                        bg: "bg-violet-50",
                        onClick: () => setShowEmployeesDetail(true)
                    },
                    {
                        title: "Clientes por Contrato",
                        value: formatNumber(report.contractClientsKPI.types.length),
                        sub: "Breakdown por tipo",
                        icon: PieIcon,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                        onClick: () => setShowContractTypesDetail(true)
                    },
                    {
                        title: "Horas Contratadas",
                        value: formatNumber(report.contractedHoursKPI.total),
                        sub: `+${formatNumber(report.contractedHoursKPI.regularizationsTotal)}h exceso regularizado`,
                        icon: Calculator,
                        color: "text-orange-600",
                        bg: "bg-orange-50",
                        onClick: () => setShowHoursDetail(true)
                    },
                    {
                        title: "Incidencias Totales",
                        value: formatNumber(report.totalIncidents),
                        sub: `${report.totalIncidents - report.prevYearIncidents >= 0 ? '+' : ''}${report.totalIncidents - report.prevYearIncidents} vs año anterior (${formatPercent(report.prevYearIncidents > 0 ? ((report.totalIncidents - report.prevYearIncidents) / report.prevYearIncidents) * 100 : 0)})`,
                        icon: Activity,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        onClick: () => setShowIncidentsDetail(true)
                    },
                ].map((kpi, i) => (
                    <Card
                        key={i}
                        className={`rounded-2xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-indigo-500/20`}
                        onClick={kpi.onClick}
                    >
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">{kpi.title}</p>
                                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{kpi.value}</h3>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                                        {kpi.title === "Equipo AM" || kpi.title === "Total Incidencias" ? (
                                            (kpi.title === "Equipo AM" ? report.employeesKPI.growthAbs : (report.totalIncidents - report.prevYearIncidents)) >= 0 ? (
                                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3 text-rose-500" />
                                            )
                                        ) : null}
                                        {kpi.sub}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${kpi.bg} dark:bg-slate-800 group-hover:scale-110 transition-transform duration-300 ml-2 shadow-sm`}>
                                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Monthly Breakdowns */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800 mb-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Evolución Mensual</CardTitle>
                            <CardDescription>Tickets creados mensualmente (Incidencias y Evolutivos)</CardDescription>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                <span className="text-xs font-bold text-slate-500">Evolutivos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                <span className="text-xs font-bold text-slate-500">Incidencias</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="evolutivos"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorEv)"
                                    activeDot={{ r: 6, strokeWidth: 0, onClick: (e: any, payload: any) => setSelectedMonth(payload.payload.month) }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="incidents"
                                    stroke="#f43f5e"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorInc)"
                                    activeDot={{ r: 6, strokeWidth: 0, onClick: (e: any, payload: any) => setSelectedMonth(payload.payload.month) }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="backlog"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    dot={{ fill: '#f59e0b', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Backlog Acumulado"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Details Modal/Section (New) */}
            {selectedMonth !== null && (
                <Card className="rounded-2xl border-none shadow-md bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800 mb-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                Detalle de {months[selectedMonth - 1]} {year}
                            </CardTitle>
                            <CardDescription>Resumen operativo del mes seleccionado</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)} className="rounded-full">
                            <XCircle className="w-5 h-5 text-slate-400" />
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Incidencias</p>
                                <p className="text-3xl font-black text-rose-500">{report.monthly[selectedMonth - 1].incidents}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Evolutivos</p>
                                <p className="text-3xl font-black text-indigo-500">{report.monthly[selectedMonth - 1].evolutivos}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Cumplimiento SLA</p>
                                <p className="text-3xl font-black text-emerald-500">{formatPercent(report.monthly[selectedMonth - 1].slaCompliance)}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Satisfacción</p>
                                <p className="text-3xl font-black text-amber-500">
                                    {report.monthly[selectedMonth - 1].satisfaction ?? 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quality & SLA Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Cumplimiento SLA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600">Resolución</span>
                                <span className="text-lg font-black text-indigo-600">{formatPercent(report.slaResolutionCompliance)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${report.slaResolutionCompliance}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600">Primera Respuesta</span>
                                <span className="text-lg font-black text-emerald-600">{formatPercent(report.slaFirstResponseCompliance)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${report.slaFirstResponseCompliance}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">MTTR Resolución</p>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-100">{formatHours(report.correctiveMetrics.mttr)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tasa Reapertura</p>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-100">{formatPercent(report.correctiveMetrics.reopenRate)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            Índice de Satisfacción (CSAT)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
                        <div className="relative mb-6">
                            <div className="w-40 h-40 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                                <span className="text-5xl font-black text-slate-800 dark:text-slate-100">
                                    {report.satisfactionMetrics.globalAvg ? report.satisfactionMetrics.globalAvg.toFixed(1) : 'N/A'}
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Puntos</span>
                            </div>
                            <div className={`absolute -bottom-2 right-0 p-3 rounded-2xl shadow-lg flex items-center gap-2 ${(report.satisfactionMetrics.globalAvg || 0) >= 4 ? 'bg-emerald-500' : 'bg-amber-500'
                                } text-white`}>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-black uppercase">Excelente</span>
                            </div>
                        </div>
                        <div className="text-center space-y-2 mb-6">
                            <p className="text-sm font-bold text-slate-500 max-w-[250px]">
                                Media aritmética basada en encuestas de satisfacción cerradas en el periodo.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="rounded-xl font-bold border-slate-200 dark:border-slate-800 w-full"
                            onClick={() => setShowSatisfactionDetail(true)}
                        >
                            Ver Análisis Detallado
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Evolutivos Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-2xl border-none shadow-sm bg-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Briefcase className="w-48 h-48" />
                    </div>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            Resumen de Evolutivos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Solicitudes</p>
                                <p className="text-4xl font-black">{formatNumber(report.evolutivos.solicitadas)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Enviadas</p>
                                <p className="text-4xl font-black">{formatNumber(report.evolutivos.enviadas)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Aprobadas</p>
                                <p className="text-4xl font-black">{formatNumber(report.evolutivos.aprobadas)}</p>
                            </div>
                            <div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Aceptación</p>
                                <p className="text-4xl font-black">{formatPercent(report.evolutivos.ratioAceptacion)}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-indigo-500/30 flex items-center gap-4">
                            <div className="flex-1 h-2 bg-indigo-900/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full"
                                    style={{ width: `${report.evolutivos.ratioAceptacion}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-bold text-indigo-100">Ratio Éxito Comercial</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4">
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                            Backlog y Pendientes
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="relative mb-4">
                                <div className="w-32 h-32 rounded-full border-8 border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                    <span className="text-4xl font-black text-slate-700 dark:text-slate-200">{report.correctiveMetrics.backlog}</span>
                                </div>
                                <div className="absolute -top-1 -right-1 p-2 bg-rose-500 rounded-full text-white">
                                    <Activity className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-center text-sm font-bold text-slate-400">Tickets en curso a cierre de periodo</p>
                        </div>
                        <Button
                            className="w-full mt-2 rounded-xl h-12 font-bold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200"
                            onClick={() => setShowBacklogDetail(true)}
                        >
                            Ver Detalles
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Backlog Detail Modal */}
            {showBacklogDetail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in duration-300">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pendientes en Backlog</CardTitle>
                                <CardDescription>Desglose por tipo y cliente</CardDescription>
                            </div>
                            <Button variant="ghost" className="rounded-full" onClick={() => { setShowBacklogDetail(false); setSelectedBacklogType(null); }}>
                                <XCircle className="w-6 h-6 text-slate-400" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!selectedBacklogType ? (
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-slate-500 mb-2">Selecciona un tipo para ver el detalle por cliente:</p>
                                    {report.correctiveMetrics.backlogDetails.map(detail => (
                                        <div
                                            key={detail.type}
                                            className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 cursor-pointer transition-colors flex justify-between items-center group"
                                            onClick={() => setSelectedBacklogType(detail.type)}
                                        >
                                            <span className="font-black text-slate-700 group-hover:text-indigo-600">{detail.type}</span>
                                            <span className="bg-white px-3 py-1 rounded-full text-sm font-black text-indigo-600 shadow-sm">{detail.count}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedBacklogType(null)} className="font-bold text-indigo-600 p-0 hover:bg-transparent">
                                            ← Volver a tipos
                                        </Button>
                                    </div>
                                    <h4 className="font-black text-lg text-indigo-600 uppercase mb-4">{selectedBacklogType}</h4>
                                    <div className="space-y-2">
                                        {report.correctiveMetrics.backlogDetails.find(d => d.type === selectedBacklogType)?.byClient.map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-3 border-b border-slate-50">
                                                <span className="text-sm font-bold text-slate-600">{c.name}</span>
                                                <span className="font-black text-slate-800">{c.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Clients Detail Modal */}
            {showClientsDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 relative">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Cartera de Clientes {year}</CardTitle>
                                    <CardDescription className="text-indigo-100 text-sm font-medium">Análisis de crecimiento y fidelidad</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowClientsDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Total</p>
                                    <p className="text-2xl font-black">{report.clientsKPI.total}</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Variación</p>
                                    <p className="text-2xl font-black">{report.clientsKPI.newAbsolute >= 0 ? '+' : ''}{report.clientsKPI.newAbsolute}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {report.clientsKPI.details.map(client => (
                                    <div key={client.id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-500/50 hover:shadow-md transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{client.name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">Cliente de Carteras AM</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Employees Detail Modal */}
            {showEmployeesDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 relative">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Estructura de Equipo AM {year}</CardTitle>
                                    <CardDescription className="text-violet-100 text-sm font-medium">Desglose por equipos funcionales AMA</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowEmployeesDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Plantilla AM</p>
                                    <p className="text-2xl font-black">{report.employeesKPI.total}</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Variación Abs</p>
                                    <p className="text-2xl font-black">{report.employeesKPI.growthAbs >= 0 ? '+' : ''}{report.employeesKPI.growthAbs}</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Variación Rel</p>
                                    <p className="text-2xl font-black">{formatPercent(report.employeesKPI.growthRel)}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="space-y-4">
                                {report.employeesKPI.teamsBreakdown.map((team, idx) => (
                                    <div key={idx} className="flex items-center gap-6 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-violet-500/20 shrink-0">
                                            {team.teamName.split(' ')[1] || 'AM'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{team.teamName}</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                                                Cierre anterior: {team.prevCount} miembros
                                            </p>
                                        </div>
                                        <div className="text-right flex items-center gap-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actual</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{team.count}</p>
                                            </div>
                                            <div className="min-w-[80px]">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Crecimiento</p>
                                                <div className={`flex items-center gap-1 font-black ${team.growthAbs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {team.growthAbs >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                    <span>{team.growthAbs >= 0 ? '+' : ''}{team.growthAbs} ({formatPercent(team.growthRel)})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Contract Types Detail Modal */}
            {showContractTypesDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Clientes por Contrato {year}</CardTitle>
                                    <CardDescription className="text-emerald-100 text-sm font-medium">Desglose porcentual y absoluto por modalidad</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowContractTypesDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {report.contractClientsKPI.types.map((t, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{t.type}</p>
                                        <p className="text-3xl font-black text-emerald-600">{t.count}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-400 mb-4 px-2">Listado de Clientes</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {report.contractClientsKPI.details.map((d, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{d.clientName}</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 uppercase shrink-0">{d.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Contracted Hours Detail Modal */}
            {showHoursDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Capacidad Contratada {year}</CardTitle>
                                    <CardDescription className="text-orange-100 text-sm font-medium">Análisis de horas, regularizaciones y consumo remanente</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowHoursDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Total Segun VP</p>
                                    <p className="text-2xl font-black">{formatNumber(report.contractedHoursKPI.total)}h</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Excesos Regularizados</p>
                                    <p className="text-2xl font-black">+{formatNumber(report.contractedHoursKPI.regularizationsTotal)}h</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Remanente No Consumido</p>
                                    <p className="text-2xl font-black text-amber-200">{formatNumber(report.contractedHoursKPI.unconsumedTotal)}h</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Work Package / Cliente</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Tipo</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Contratado</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Consumido</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Remanente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {report.contractedHoursKPI.breakdownByWP.map((wp, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">{wp.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">{wp.type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-400">{formatNumber(wp.contracted)}h</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-indigo-600">{formatNumber(wp.consumed)}h</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-sm font-black ${wp.remaining > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                                                        {formatNumber(wp.remaining)}h
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Incidents Detail Modal */}
            {showIncidentsDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Análisis de Incidencias {year}</CardTitle>
                                    <CardDescription className="text-blue-100 text-sm font-medium">Comparativa interanual y distribución por tipología</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowIncidentsDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-white/10 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Año Actual ({year})</p>
                                    <p className="text-3xl font-black">{formatNumber(report.totalIncidents)}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Año Anterior ({year - 1})</p>
                                    <div className="flex items-end gap-3">
                                        <p className="text-3xl font-black">{formatNumber(report.prevYearIncidents)}</p>
                                        <div className={`mb-1 flex items-center gap-1 text-sm font-bold ${report.totalIncidents <= report.prevYearIncidents ? 'text-emerald-300' : 'text-rose-300'}`}>
                                            {report.totalIncidents > report.prevYearIncidents ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {formatPercent(report.prevYearIncidents > 0 ? ((report.totalIncidents - report.prevYearIncidents) / report.prevYearIncidents) * 100 : 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-400 mb-2 px-2">Desglose por Tipo</h4>
                                {report.incidentsByType.map((item, idx) => {
                                    const diff = item.count - item.prevCount;
                                    const perc = item.prevCount > 0 ? (diff / item.prevCount) * 100 : (item.count > 0 ? 100 : 0);
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                                    <ClipboardList className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{item.type}</span>
                                                    <p className="text-[10px] font-bold text-slate-400">Año anterior: {item.prevCount}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-slate-800 dark:text-slate-100">{item.count}</p>
                                                <div className={`flex items-center justify-end gap-1 text-[10px] font-black ${diff <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {diff > 0 ? '+' : ''}{diff} ({diff > 0 ? '+' : ''}{perc.toFixed(1)}%)
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Satisfaction Detail Modal */}
            {showSatisfactionDetail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-none flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Análisis de Satisfacción Global {year}</CardTitle>
                                    <CardDescription className="text-blue-100 text-sm font-medium">Desglose de satisfacción por equipo y tipo de ticket</CardDescription>
                                </div>
                                <Button variant="ghost" className="rounded-full text-white hover:bg-white/20" size="icon" onClick={() => setShowSatisfactionDetail(false)}>
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-white/10 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Media Global</p>
                                    <p className="text-3xl font-black">{report.satisfactionMetrics.globalAvg?.toFixed(2) || 'N/A'}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase opacity-80">Año Anterior</p>
                                    <p className="text-3xl font-black">{report.satisfactionMetrics.prevYearAvg?.toFixed(2) || 'N/A'}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto bg-white dark:bg-slate-900 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-400 px-2 tracking-widest">Satisfacción por Equipo</h4>
                                    <div className="space-y-2">
                                        {report.satisfactionMetrics.byTeam.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.team}</span>
                                                    <span className="text-sm font-black text-indigo-600">{item.avg.toFixed(1)}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.avg / 5) * 100}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{item.count} tickets encuestados</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-slate-400 px-2 tracking-widest">Satisfacción por Tipo de Ticket</h4>
                                    <div className="space-y-2">
                                        {report.satisfactionMetrics.byType.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.type}</span>
                                                    <span className="text-sm font-black text-emerald-600">{item.avg.toFixed(1)}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(item.avg / 5) * 100}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{item.count} tickets encuestados</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
