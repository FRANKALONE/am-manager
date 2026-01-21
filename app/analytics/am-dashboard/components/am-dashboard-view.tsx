"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell, PieChart, Pie, AreaChart, Area
} from "recharts";
import {
    Activity, TrendingUp, CheckCircle2, Clock, FileText, Users,
    ArrowUpRight, ArrowDownRight, Filter, Download, Calendar, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Props {
    currentData: any;
    previousData: any;
    year: number;
    allClients: any[];
    selectedClientId?: string;
}

export function AmDashboardView({ currentData, previousData, year, allClients, selectedClientId }: Props) {
    const router = useRouter();

    // Process Data logic
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const getMonthlyData = (data: any) => {
        return months.map((month, index) => {
            const m = index + 1;
            const created = data.tickets.filter((t: any) => new Date(t.createdDate).getMonth() + 1 === m).length;
            const delivered = data.transitions.filter((h: any) =>
                h.type === 'TICKET' &&
                h.status === 'ENTREGADO EN PRO' &&
                new Date(h.transitionDate).getMonth() + 1 === m
            ).length;

            return { name: month, creados: created, entregados: delivered };
        });
    };

    const currentMonthly = getMonthlyData(currentData);
    const prevMonthly = getMonthlyData(previousData);

    const totalCreados = currentData.tickets.length;
    const totalEntregados = currentData.transitions.filter((h: any) => h.type === 'TICKET' && h.status === 'ENTREGADO EN PRO').length;

    const prevTotalCreados = previousData.tickets.length;
    const prevTotalEntregados = previousData.transitions.filter((h: any) => h.type === 'TICKET' && h.status === 'ENTREGADO EN PRO').length;

    const calcTrend = (curr: number, prev: number) => {
        if (prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const creadosTrend = calcTrend(totalCreados, prevTotalCreados);
    const entregadosTrend = calcTrend(totalEntregados, prevTotalEntregados);

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Análisis Operativo {year}</h2>
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

                    <Select value={selectedClientId || "all"} onValueChange={(v) => {
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
                            {allClients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="rounded-xl font-bold gap-2">
                        <Download className="w-4 h-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Tickets Creados", value: totalCreados, trend: creadosTrend, icon: FileText, color: "blue", desc: "Altas totales" },
                    { title: "Entregas en PRO", value: totalEntregados, trend: entregadosTrend, icon: CheckCircle2, color: "emerald", desc: "Pasos a producción" },
                    { title: "Horas Vendidas", value: currentData.worklogs.reduce((s: any, w: any) => s + w.timeSpentHours, 0).toFixed(1), trend: 0, icon: Briefcase, color: "amber", desc: "Total facturable" },
                    { title: "Ratio Aceptación", value: "85%", trend: 5, icon: TrendingUp, color: "indigo", desc: "Propuestas aprobadas" }
                ].map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden relative group">
                        <div className={`absolute -right-4 -top-4 p-6 opacity-[0.03] group-hover:scale-150 transition-transform duration-700 text-${kpi.color}-600`}>
                            <kpi.icon className="w-20 h-20" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">{kpi.title}</CardTitle>
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
                                <span className="text-[10px] font-medium text-slate-400">{kpi.desc}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Evolución Mensual de Producción */}
                <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            Evolución Mensual de Producción
                        </CardTitle>
                        <CardDescription>Comparativa entre altas de tickets y entregas certificadas en PRO</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={currentMonthly}>
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
                                <Area type="monotone" dataKey="creados" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAltas)" name="Creados" />
                                <Area type="monotone" dataKey="entregados" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPRO)" name="Entregados PRO" />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 2. Comparativa Interanual de Actividad */}
                <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Ritmo de Creación vs Año Anterior
                        </CardTitle>
                        <CardDescription>Seguimiento de madurez del pool de peticiones</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentMonthly.map((m, i) => ({ ...m, p: prevMonthly[i].creados }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                <Bar dataKey="p" fill="#CBD5E1" radius={[4, 4, 0, 0]} name={`${year - 1}`} />
                                <Bar dataKey="creados" fill="#6366f1" radius={[4, 4, 0, 0]} name={`${year}`} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 3. Top Clientes por Actividad */}
                <Card className="lg:col-span-1 border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Top 5 Clientes (Evolutivos)</CardTitle>
                        <CardDescription>Clientes con mayor volumen este año</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Dummy data for top clients logic */}
                            {[
                                { name: "VISCOFAN", val: 42, color: "bg-blue-500" },
                                { name: "UAX", val: 35, color: "bg-indigo-500" },
                                { name: "OESÍA", val: 28, color: "bg-emerald-500" },
                                { name: "VIROQUE", val: 15, color: "bg-amber-500" },
                                { name: "SDG", val: 12, color: "bg-purple-500" }
                            ].map((c, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span>{c.name}</span>
                                        <span className="text-slate-400">{c.val} tickets</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${c.color} rounded-full`} style={{ width: `${(c.val / 42) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Embudos de Propuesta y Más */}
                <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Producción AM por Tipología</CardTitle>
                        <CardDescription>Distribución de carga de trabajo por tipo de petición</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Evolutivos', value: 60 },
                                        { name: 'Correctivos', value: 25 },
                                        { name: 'Consultas', value: 15 },
                                    ]}
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {[0, 1, 2].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b'][index % 3]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
