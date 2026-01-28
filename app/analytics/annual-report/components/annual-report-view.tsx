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
    Search, BarChart3, Activity, Briefcase
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
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-indigo-600" />
                        Informe Anual {year}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Análisis detallado de calidad, SLA y volumen de servicio
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Total Incidencias", value: formatNumber(report.totalIncidents), sub: "Volumen anual", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "SLA Resolución", value: formatPercent(report.slaResolutionCompliance), sub: `${formatNumber(report.slaMetrics.resolution.compliant)} tickets ok`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
                    { title: "SLA Primera Respuesta", value: formatPercent(report.slaFirstResponseCompliance), sub: `${formatNumber(report.slaMetrics.firstResponse.compliant)} tickets ok`, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
                    { title: "Clientes Totales", value: formatNumber(report.clients.total), sub: `+${report.clients.newClients.length} nuevos este año`, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((kpi, i) => (
                    <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
                                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{kpi.value}</h3>
                                    <p className="text-xs font-medium text-slate-400 mt-1">{kpi.sub}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${kpi.bg} dark:bg-slate-800 group-hover:scale-110 transition-transform duration-300`}>
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
                            <CardDescription>Comparativa entre Incidencias y Evolutivos</CardDescription>
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
                                <Area type="monotone" dataKey="evolutivos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEv)" />
                                <Area type="monotone" dataKey="incidents" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

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
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${report.slaResolutionCompliance}%` }}></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-600">Primera Respuesta</span>
                                <span className="text-lg font-black text-emerald-600">{formatPercent(report.slaFirstResponseCompliance)}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${report.slaFirstResponseCompliance}%` }}></div>
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
                            Distribución por Tipo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={report.incidentsByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {report.incidentsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
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
                                <div className="h-full bg-white rounded-full" style={{ width: `${report.evolutivos.ratioAceptacion}%` }}></div>
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
                        <Button className="w-full mt-2 rounded-xl h-12 font-bold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200">
                            Ver Detalles
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
