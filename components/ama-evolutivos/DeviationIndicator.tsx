'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell
} from 'recharts';
import { Filter, Calendar, Users, Building2, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Download, Table } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeviationData {
    key: string;
    summary: string;
    resolutionDate: string;
    plannedDate: string;
    replannedDate?: string;
    deviationDays: number;
    deviationFromPlan: number;
    deviationFromReplan: number | null;
    replanImpact: number | null;
    wasReplanned: boolean;
    monthYear: string;
    year: number;
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
        period: 'month', // 'month' or 'year'
        startMonth: '',
        endMonth: '',
        showOnlyReplanned: false
    });
    const [tableSearch, setTableSearch] = useState({
        client: '',
        manager: '',
        hitoKey: '',
        evolutivo: ''
    });
    const [showDetailTable, setShowDetailTable] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/ama-evolutivos/deviation');
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json)) {
                        setData(json);
                    } else if (json.data && Array.isArray(json.data)) {
                        setData(json.data);
                        console.log('Debug info from API:', json.debug);
                    }
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
            if (filters.startMonth && item.monthYear < filters.startMonth) return false;
            if (filters.endMonth && item.monthYear > filters.endMonth) return false;
            if (filters.showOnlyReplanned && !item.wasReplanned) return false;
            return true;
        });
    }, [data, filters]);

    const tableFilteredData = useMemo(() => {
        return filteredData.filter(item => {
            if (tableSearch.client && !item.client.toLowerCase().includes(tableSearch.client.toLowerCase())) return false;
            if (tableSearch.manager && !item.manager.toLowerCase().includes(tableSearch.manager.toLowerCase())) return false;
            if (tableSearch.hitoKey && !item.key.toLowerCase().includes(tableSearch.hitoKey.toLowerCase())) return false;
            if (tableSearch.evolutivo && !item.evolutivo.toLowerCase().includes(tableSearch.evolutivo.toLowerCase())) return false;
            return true;
        });
    }, [filteredData, tableSearch]);

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

    // Generar últimos 24 meses como opciones si no hay datos suficientes
    const uniqueMonths = useMemo(() => {
        const months = new Set(data.map(i => i.monthYear));

        // Añadir meses actuales y pasados para asegurar que 2025/2026 están siempre
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.add(format(d, 'yyyy-MM'));
        }

        return Array.from(months).sort();
    }, [data]);

    const uniqueClients = useMemo(() => Array.from(new Set(data.map(i => i.client))).sort(), [data]);
    const uniqueManagers = useMemo(() => Array.from(new Set(data.map(i => i.manager))).sort(), [data]);
    const uniqueEvolutivos = useMemo(() => {
        const evos = new Map();
        data.forEach(i => evos.set(i.evolutivo, i.evolutivoSummary));
        return Array.from(evos.entries()).sort((a, b: any) => a[0].localeCompare(b[0]));
    }, [data]);

    useEffect(() => {
        if (uniqueMonths.length > 0 && !filters.startMonth) {
            // Por defecto últimos 6 meses cargados
            const end = uniqueMonths[uniqueMonths.length - 1];
            // Buscar un mes de inicio razonable (hace 6 meses)
            const sixMonthsAgo = format(new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1), 'yyyy-MM');
            const start = uniqueMonths.find(m => m >= sixMonthsAgo) || uniqueMonths[0];

            setFilters(prev => ({
                ...prev,
                startMonth: start,
                endMonth: end
            }));
        }
    }, [uniqueMonths, filters.startMonth]);

    // Funciones auxiliares
    const getDeviationColor = (days: number | null) => {
        if (days === null) return 'text-gray-400';
        if (days <= 0) return 'text-green-600';
        if (days <= 5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getDeviationBgColor = (days: number | null) => {
        if (days === null) return 'bg-gray-50';
        if (days <= 0) return 'bg-green-50';
        if (days <= 5) return 'bg-yellow-50';
        return 'bg-red-50';
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedDetailData = useMemo(() => {
        let sortableData = [...tableFilteredData];
        if (sortConfig !== null) {
            sortableData.sort((a: any, b: any) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [tableFilteredData, sortConfig]);

    const exportToCSV = () => {
        const headers = ['Clave', 'Resumen', 'Evolutivo', 'Cliente', 'Gestor', 'Fecha Planificada', 'Fecha Replanificada', 'Fecha Cierre', 'Desv. Plan', 'Desv. Replan', 'Impacto Replan'];
        const rows = sortedDetailData.map(item => [
            item.key,
            item.summary,
            item.evolutivo,
            item.client,
            item.manager,
            item.plannedDate,
            item.replannedDate || 'N/A',
            item.resolutionDate,
            item.deviationFromPlan,
            item.deviationFromReplan !== null ? item.deviationFromReplan : 'N/A',
            item.replanImpact !== null ? item.replanImpact : 'N/A'
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `desviacion-hitos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    // Métricas de replanificación
    const replannedHitos = filteredData.filter(item => item.wasReplanned);
    const replannedCount = replannedHitos.length;
    const replannedPercentage = filteredData.length > 0 ? ((replannedCount / filteredData.length) * 100).toFixed(1) : '0';

    const replanEffectiveness = replannedHitos.length > 0
        ? ((replannedHitos.filter(item => item.deviationFromReplan !== null && item.deviationFromReplan <= 0).length / replannedHitos.length) * 100).toFixed(1)
        : '0';

    const avgReplanImpact = replannedHitos.length > 0
        ? (replannedHitos.reduce((sum, item) => sum + (item.replanImpact || 0), 0) / replannedHitos.length).toFixed(1)
        : '0';

    const avgDeviation = filteredData.length > 0
        ? (filteredData.reduce((sum, item) => sum + item.deviationDays, 0) / filteredData.length).toFixed(1)
        : '0';

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
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">Desde</div>
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.startMonth}
                            onChange={(e) => setFilters(prev => ({ ...prev, startMonth: e.target.value }))}
                            title="Mes de inicio"
                        >
                            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="w-px h-4 bg-gray-300 mx-1" />
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">Hasta</div>
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.endMonth}
                            onChange={(e) => setFilters(prev => ({ ...prev, endMonth: e.target.value }))}
                            title="Mes de fin"
                        >
                            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            value={filters.period}
                            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                            title="Agrupación"
                        >
                            <option value="month">Vista Mensual</option>
                            <option value="year">Vista Anual</option>
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
                                    .slice(0, 5)
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
                                    .slice(0, 5)
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
                                    .slice(0, 5)
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

            {/* Sección de Detalle de Hitos */}
            <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setShowDetailTable(!showDetailTable)}
                        className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                        <Table className="w-5 h-5" />
                        Detalle de Hitos
                        {showDetailTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {showDetailTable && (
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                    )}
                </div>

                {showDetailTable && (
                    <div className="space-y-6">
                        {/* Métricas de Replanificación */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                <div className="text-purple-600 text-sm font-medium mb-1">Hitos Replanificados</div>
                                <div className="text-2xl font-bold text-purple-900">{replannedCount}</div>
                                <div className="text-xs text-purple-600 mt-1">{replannedPercentage}% del total</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                <div className="text-green-600 text-sm font-medium mb-1">Efectividad Replan</div>
                                <div className="text-2xl font-bold text-green-900">{replanEffectiveness}%</div>
                                <div className="text-xs text-green-600 mt-1">Cumplieron nueva fecha</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                                <div className="text-orange-600 text-sm font-medium mb-1">Impacto Promedio</div>
                                <div className="text-2xl font-bold text-orange-900">{avgReplanImpact} días</div>
                                <div className="text-xs text-orange-600 mt-1">Días movidos en replan</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                <div className="text-blue-600 text-sm font-medium mb-1">Desviación Media</div>
                                <div className="text-2xl font-bold text-blue-900">{avgDeviation} días</div>
                                <div className="text-xs text-blue-600 mt-1">Del plan original</div>
                            </div>
                        </div>

                        {/* Filtro de Replanificados */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showOnlyReplanned"
                                checked={filters.showOnlyReplanned}
                                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyReplanned: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showOnlyReplanned" className="text-sm font-medium text-gray-700 cursor-pointer">
                                Mostrar solo hitos replanificados
                            </label>
                        </div>

                        {/* Búsqueda en Tabla */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Cliente</label>
                                <input
                                    type="text"
                                    placeholder="Ej: ACOLAD"
                                    value={tableSearch.client}
                                    onChange={(e) => setTableSearch(prev => ({ ...prev, client: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Gestor</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Juan"
                                    value={tableSearch.manager}
                                    onChange={(e) => setTableSearch(prev => ({ ...prev, manager: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Hito (ID)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: MER-160"
                                    value={tableSearch.hitoKey}
                                    onChange={(e) => setTableSearch(prev => ({ ...prev, hitoKey: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Buscar Evolutivo (ID)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: ACO-13"
                                    value={tableSearch.evolutivo}
                                    onChange={(e) => setTableSearch(prev => ({ ...prev, evolutivo: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Tabla Detallada con Scroll Interno */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            {[
                                                { key: 'key', label: 'Clave' },
                                                { key: 'summary', label: 'Resumen' },
                                                { key: 'evolutivo', label: 'Evolutivo' },
                                                { key: 'client', label: 'Cliente' },
                                                { key: 'manager', label: 'Gestor' },
                                                { key: 'plannedDate', label: 'Fecha Planificada' },
                                                { key: 'replannedDate', label: 'Fecha Replan' },
                                                { key: 'resolutionDate', label: 'Fecha Cierre' },
                                                { key: 'deviationFromPlan', label: 'Desv. Plan' },
                                                { key: 'deviationFromReplan', label: 'Desv. Replan' },
                                                { key: 'replanImpact', label: 'Impacto Replan' }
                                            ].map(({ key, label }) => (
                                                <th
                                                    key={key}
                                                    onClick={() => handleSort(key)}
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {label}
                                                        {sortConfig?.key === key && (
                                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedDetailData.map((item) => (
                                            <tr key={item.key} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                    <a
                                                        href={`https://altim.atlassian.net/browse/${item.key}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {item.key}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.summary}>
                                                    {item.summary}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {item.evolutivo}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {item.client}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {item.manager}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {format(parseISO(item.plannedDate), 'dd/MM/yyyy', { locale: es })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {item.replannedDate ? format(parseISO(item.replannedDate), 'dd/MM/yyyy', { locale: es }) : '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {format(parseISO(item.resolutionDate), 'dd/MM/yyyy', { locale: es })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded font-medium ${getDeviationBgColor(item.deviationFromPlan)} ${getDeviationColor(item.deviationFromPlan)}`}>
                                                        {item.deviationFromPlan > 0 ? '+' : ''}{item.deviationFromPlan}d
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {item.deviationFromReplan !== null ? (
                                                        <span className={`px-2 py-1 rounded font-medium ${getDeviationBgColor(item.deviationFromReplan)} ${getDeviationColor(item.deviationFromReplan)}`}>
                                                            {item.deviationFromReplan > 0 ? '+' : ''}{item.deviationFromReplan}d
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {item.replanImpact !== null ? (
                                                        <span className={`px-2 py-1 rounded font-medium ${getDeviationBgColor(item.replanImpact)} ${getDeviationColor(item.replanImpact)}`}>
                                                            {item.replanImpact > 0 ? '+' : ''}{item.replanImpact}d
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {sortedDetailData.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No hay hitos que coincidan con los filtros seleccionados
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
