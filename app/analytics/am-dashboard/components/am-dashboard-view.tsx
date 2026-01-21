"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";
import {
    Activity, TrendingUp, CheckCircle2, Clock, FileText, Users,
    ArrowUpRight, ArrowDownRight, Filter, Download, Calendar, Briefcase,
    BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Props {
    report: any; // Result from getAmManagementReport
}

export function AmDashboardView({ report }: Props) {
    const router = useRouter();
    const { year, current, previous, monthly, topClientsCount, topClientsVolume, topClientsRatio, clients } = report;

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartData = monthly.map((m: any) => ({
        ...m,
        name: months[m.month - 1]
    }));

    const calcPercentChange = (curr: number, prev: number) => {
        if (!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Cuadro de Mando AM {year}</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Referencia año anterior: {year - 1}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select value={String(year)} onValueChange={(v) => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('year', v);
                        router.push(`?${params.toString()}`);
                    }}>
                        <SelectTrigger className="w-[120px] rounded-xl font-bold">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026].map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select onValueChange={(v) => {
                        const params = new URLSearchParams(window.location.search);
                        if (v === "all") params.delete('clientId');
                        else params.set('clientId', v);
                        router.push(`?${params.toString()}`);
                    }}>
                        <SelectTrigger className="w-[200px] rounded-xl font-bold">
                            <Users className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Todos los Clientes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Clientes</SelectItem>
                            {clients.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards (Metrics 1, 2, 3, 6) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        title: "Evolutivos Creados",
                        value: current.ticketsCount,
                        trend: calcPercentChange(current.ticketsCount, previous.ticketsCount),
                        icon: FileText, color: "blue",
                        desc: "Tickets tipo Evolutivo"
                    },
                    {
                        title: "Entregas en PRO",
                        value: current.deliveredCount,
                        trend: calcPercentChange(current.deliveredCount, previous.deliveredCount),
                        icon: CheckCircle2, color: "emerald",
                        desc: "Estado 'Entregado en PRO'"
                    },
                    {
                        title: "Evolutivo Medio",
                        value: current.avgHours.toFixed(1) + " j",
                        trend: calcPercentChange(current.avgHours, previous.avgHours),
                        icon: Briefcase, color: "amber",
                        desc: "Jornadas estimadas/ticket"
                    },
                    {
                        title: "Ratio Aceptación",
                        value: current.acceptanceRatio.toFixed(0) + "%",
                        trend: 0,
                        icon: TrendingUp, color: "indigo",
                        desc: "Aprobadas vs Enviadas"
                    }
                ].map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden relative group">
                        <div className={`absolute -right-4 -top-4 p-6 opacity-[0.03] group-hover:scale-150 transition-transform duration-700 text-${kpi.color}-600`}>
                            <kpi.icon className="w-20 h-20" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">{kpi.value}</div>
                            <div className="flex items-center gap-2">
                                {kpi.trend !== 0 && (
                                    <div className={`flex items-center text-xs font-black ${kpi.trend > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                        {kpi.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(kpi.trend).toFixed(1)}%
                                    </div>
                                )}
                                <span className="text-[10px] font-medium text-slate-400 italic">{kpi.desc}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Metrics 4, 5, 7 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: "Ofertas Solicitadas", value: current.proposalsRequested, icon: Clock, desc: "Basado en creación" },
                    { title: "Ofertas Enviadas", value: current.proposalsSent, icon: Activity, desc: "Enviado a Gerente/Cliente" },
                    { title: "Ratio Envío/Solicitud", value: current.sentVsRequestedRatio.toFixed(1) + "%", icon: BarChart3, desc: "Procesamiento de preventa" }
                ].map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-slate-50/50">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">{kpi.title}</p>
                                    <h3 className="text-2xl font-black text-slate-800 mt-1">{kpi.value}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">{kpi.desc}</p>
                                </div>
                                <kpi.icon className="w-8 h-8 text-slate-200" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Evolución Mensual (Metrics 1, 2, 4, 5 desglosadas) */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            Evolución Evolutivos y Producción
                        </CardTitle>
                        <CardDescription>Tickets creados vs Entregas PRO (Mensual)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorAltas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPRO" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="creados" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAltas)" name="Creados (Evolutivos)" />
                                <Area type="monotone" dataKey="entregados" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPRO)" name="Entregados PRO" />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Evolución Preventa */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-emerald-500" />
                            Evolución de Ofertas (Preventa)
                        </CardTitle>
                        <CardDescription>Solicitadas vs Enviadas (Mensual)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                <Bar dataKey="requested" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Solicitadas" />
                                <Bar dataKey="sent" fill="#6366f1" radius={[4, 4, 0, 0]} name="Enviadas" />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics 8, 9, 10 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Metric 8: Top 10 Clientes por Ejecución */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Top 10 Clientes (Ejecución)</CardTitle>
                        <CardDescription>Por nº de evolutivos creados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topClientsCount.map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                                        <span className="text-sm font-bold text-slate-700 truncate">{c.name}</span>
                                    </div>
                                    <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded">{c.ticketsCount}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 9: Top 10 Clientes por Volumen */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Top 10 Clientes (Volumen)</CardTitle>
                        <CardDescription>Por jornadas hoy firmadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topClientsVolume.map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                                        <span className="text-sm font-bold text-slate-700 truncate">{c.name}</span>
                                    </div>
                                    <span className="text-xs font-black bg-amber-50 text-amber-600 px-2 py-1 rounded">{c.volume.toFixed(1)} j</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metric 10: Ratio Aceptación por Cliente */}
                <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Aceptación por Cliente</CardTitle>
                        <CardDescription>Ratio propuestas Aprobadas vs Solicitadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topClientsRatio.map((c: any, i: number) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="truncate max-w-[150px]">{c.name}</span>
                                        <span className="text-emerald-600">{c.acceptanceRatio.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                            style={{ width: `${c.acceptanceRatio}%` } as React.CSSProperties}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

