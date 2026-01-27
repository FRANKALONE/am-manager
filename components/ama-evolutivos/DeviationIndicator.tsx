'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell
} from 'recharts';
import { Filter, Calendar, Users, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeviationData {
    key: string;
    summary: string;
    resolutionDate: string;
    plannedDate: string;
    deviationDays: number;
    monthYear: string;
    client: string;
    manager: string;
    responsible: string;
    evolutivo: string;
    evolutivoSummary: string;
}

export function DeviationIndicator() {
    const [data, setData] = useState<DeviationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        client: '',
        manager: '',
        evolutivo: '',
        period: 'month' // 'month' or 'year'
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/ama-evolutivos/deviation');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error('Error fetching deviation data:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (filters.client && item.client !== filters.client) return false;
            if (filters.manager && item.manager !== filters.manager) return false;
            if (filters.evolutivo && item.evolutivo !== filters.evolutivo) return false;
            return true;
        });
    }, [data, filters]);

    const chartData = useMemo(() => {
        const groups: Record<string, { totalDays: number; count: number; delayedCount: number; absTotalDays: number }> = {};

        filteredData.forEach(item => {
            const key = filters.period === 'year' ? item.monthYear.substring(0, 4) : item.monthYear;
            if (!groups[key]) {
                groups[key] = { totalDays: 0, count: 0, delayedCount: 0, absTotalDays: 0 };
            }
            groups[key].totalDays += item.deviationDays;
            groups[key].absTotalDays += Math.abs(item.deviationDays);
            groups[key].count += 1;
            if (item.deviationDays > 0) {
                groups[key].delayedCount += 1;
            }
        });

        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, stats]) => ({
                name: key,
                avgDeviation: Number((stats.totalDays / stats.count).toFixed(1)),
                avgAbsDeviation: Number((stats.absTotalDays / stats.count).toFixed(1)),
                delayRate: Number(((stats.delayedCount / stats.count) * 100).toFixed(1)),
                count: stats.count
            }));
    }, [filteredData, filters.period]);

    const uniqueClients = useMemo(() => Array.from(new Set(data.map(i => i.client))).sort(), [data]);
    const uniqueManagers = useMemo(() => Array.from(new Set(data.map(i => i.manager))).sort(), [data]);
    const uniqueEvolutivos = useMemo(() => {
        const evos = new Map();
        data.forEach(i => evos.set(i.evolutivo, i.evolutivoSummary));
        return Array.from(evos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [data]);

    if (loading) return (
        <div className="h-64 flex items-center justify-center bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="animate-pulse text-gray-400 font-medium">Cargando métricas de desviación...</div>
        </div>
    );

    return (
        <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Control de Desviación de Hitos
                    </h2>
                    <p className="text-gray-600 mt-1">Análisis de desfase entre fecha planificada y cierre real</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.client}
                            onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value }))}
                            title="Filtrar por Cliente"
                            aria-label="Filtrar por Cliente"
                        >
                            <option value="">Todos los Clientes</option>
                            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Users className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.manager}
                            onChange={(e) => setFilters(prev => ({ ...prev, manager: e.target.value }))}
                            title="Filtrar por Gestor"
                            aria-label="Filtrar por Gestor"
                        >
                            <option value="">Todos los Gestores</option>
                            {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.period}
                            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                            title="Periodo de tiempo"
                            aria-label="Periodo de tiempo"
                        >
                            <option value="month">Por Mes</option>
                            <option value="year">Por Año</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart 1: Absolute Deviation */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Desviación Media (Días)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [`${value} días`, 'Promedio']}
                                />
                                <Bar dataKey="avgAbsDeviation" radius={[4, 4, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.avgAbsDeviation > 5 ? '#f87171' : entry.avgAbsDeviation > 2 ? '#fbbf24' : '#60a5fa'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Legend/Summary Cards */}
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">Global Hitos</p>
                        <p className="text-3xl font-black text-blue-900">{filteredData.length}</p>
                        <p className="text-blue-600/70 text-sm mt-1">Hitos analizados en el periodo</p>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                        <p className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-1">Tasa de Retraso</p>
                        <p className="text-3xl font-black text-amber-900">
                            {filteredData.length > 0
                                ? ((filteredData.filter(i => i.deviationDays > 0).length / filteredData.length) * 100).toFixed(1)
                                : '0'}%
                        </p>
                        <p className="text-amber-600/70 text-sm mt-1">Hitos cerrados después de fecha</p>
                    </div>

                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Alerta Mayor Desfase</span>
                        </div>
                        {filteredData.length > 0 ? (
                            (() => {
                                const max = filteredData.reduce((prev, current) => (prev.deviationDays > current.deviationDays) ? prev : current);
                                return (
                                    <>
                                        <p className="text-lg font-bold truncate" title={max.summary}>{max.summary}</p>
                                        <p className="text-2xl font-black mt-1">+{max.deviationDays} días</p>
                                    </>
                                );
                            })()
                        ) : <p className="font-medium">Sin datos</p>}
                    </div>
                </div>
            </div>

            {/* Chart 2: Relative Deviation Line */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Términos Relativos (% de Hitos con Retraso)</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit="%" />
                            <Tooltip
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="delayRate"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                                name="Hitos con Retraso"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Rankings Section */}
            <div className="pt-8 border-t border-gray-100 space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Top Desviaciones por Categoría</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Top Clientes */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                            <Building2 className="w-4 h-4" />
                            <span>Top Clientes</span>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                const counts: Record<string, number> = {};
                                filteredData.filter(i => i.deviationDays > 0).forEach(i => {
                                    counts[i.client] = (counts[i.client] || 0) + 1;
                                });
                                return Object.entries(counts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([name, count], idx) => (
                                        <div key={name} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 truncate mr-2">{idx + 1}. {name}</span>
                                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">{count} hitos</span>
                                        </div>
                                    ));
                            })()}
                        </div>
                    </div>

                    {/* Top Responsables */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                            <Users className="w-4 h-4" />
                            <span>Top Responsables</span>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                const counts: Record<string, number> = {};
                                filteredData.filter(i => i.deviationDays > 0).forEach(i => {
                                    counts[i.responsible] = (counts[i.responsible] || 0) + 1;
                                });
                                return Object.entries(counts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([name, count], idx) => (
                                        <div key={name} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 truncate mr-2">{idx + 1}. {name}</span>
                                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">{count} hitos</span>
                                        </div>
                                    ));
                            })()}
                        </div>
                    </div>

                    {/* Top Gestores */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                            <Users className="w-4 h-4" />
                            <span>Top Gestores</span>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                const counts: Record<string, number> = {};
                                filteredData.filter(i => i.deviationDays > 0).forEach(i => {
                                    counts[i.manager] = (counts[i.manager] || 0) + 1;
                                });
                                return Object.entries(counts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 3)
                                    .map(([name, count], idx) => (
                                        <div key={name} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 truncate mr-2">{idx + 1}. {name}</span>
                                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">{count} hitos</span>
                                        </div>
                                    ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-xs font-medium outline-none cursor-pointer max-w-[250px]"
                            value={filters.evolutivo}
                            onChange={(e) => setFilters(prev => ({ ...prev, evolutivo: e.target.value }))}
                            title="Filtrar por Evolutivo"
                            aria-label="Filtrar por Evolutivo"
                        >
                            <option value="">Todos los Evolutivos</option>
                            {uniqueEvolutivos.map(([key, label]) => (
                                <option key={key} value={key}>{key} - {label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
