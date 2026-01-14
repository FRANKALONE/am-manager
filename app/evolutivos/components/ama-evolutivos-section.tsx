'use client';

import { useEffect, useState } from 'react';
import { Layers, AlertTriangle, Calendar, Clock, ListTodo, User, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard } from '@/components/ama-evolutivos/StatCard';
import { CategoryCard } from '@/components/ama-evolutivos/CategoryCard';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';

export function AMAEvolutivosSection() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [evolutivosList, setEvolutivosList] = useState<JiraIssue[]>([]);
    const [selectedManager, setSelectedManager] = useState<string>('');

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/ama-evolutivos/issues');
                if (!res.ok) {
                    const errorJson = await res.json().catch(() => ({}));
                    throw new Error(errorJson.error || `Error ${res.status}: ${res.statusText}`);
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
                console.warn("Using mock data due to error");
                setData({
                    summary: { expired: 0, today: 0, upcoming: 0, others: 0, unplanned: 0 },
                    issues: { expired: [], today: [], upcoming: [], others: [], unplanned: [] },
                    managers: []
                });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        async function fetchEvolutivos() {
            try {
                const res = await fetch('/api/ama-evolutivos/evolutivos');
                if (res.ok) {
                    const data = await res.json();
                    setEvolutivosList(data);
                }
            } catch (e) {
                console.error(e);
            }
        }
        fetchEvolutivos();
    }, []);

    const getFilteredEvolutivosStats = () => {
        let list = evolutivosList;

        if (selectedManager) {
            if (selectedManager === 'unassigned') {
                list = list.filter((i) => !i.gestor || !i.gestor.id);
            } else {
                list = list.filter((i) => i.gestor?.id === selectedManager);
            }
        }

        const planned = list.filter((i) => (i.pendingHitos || 0) > 0).length;
        const unplanned = list.filter((i) => (i.pendingHitos || 0) === 0).length;

        return { planned, unplanned };
    };

    const getFilteredSummary = () => {
        if (!data) return { expired: 0, today: 0, upcoming: 0, others: 0, unplanned: 0 };
        if (!selectedManager) return data.summary;

        const filterFn = (i: JiraIssue) => {
            if (selectedManager === 'unassigned') return !i.gestor || !i.gestor.id;
            return i.gestor?.id === selectedManager;
        };

        return {
            expired: data.issues.expired.filter(filterFn).length,
            today: data.issues.today.filter(filterFn).length,
            upcoming: data.issues.upcoming.filter(filterFn).length,
            others: data.issues.others.filter(filterFn).length,
            unplanned: data.issues.unplanned.filter(filterFn).length,
            activeEvolutivos: data.summary.activeEvolutivos
        };
    };

    const getHealthStats = () => {
        let list = evolutivosList;

        if (selectedManager) {
            if (selectedManager === 'unassigned') {
                list = list.filter((i) => !i.gestor || !i.gestor.id);
            } else {
                list = list.filter((i) => i.gestor?.id === selectedManager);
            }
        }

        const measurableProjects = list.filter(i => (i.timeoriginalestimate || 0) > 0);
        if (measurableProjects.length === 0) return { percent: 100, label: 'Sin Estimaciones' };

        const healthyProjects = measurableProjects.filter(i => {
            const est = i.timeoriginalestimate || 0;
            const spent = i.timespent || 0;
            return spent <= est;
        });

        const percent = Math.round((healthyProjects.length / measurableProjects.length) * 100);
        return { percent, label: `${healthyProjects.length} / ${measurableProjects.length} en tiempo` };
    };

    const evolutivoStats = getFilteredEvolutivosStats();
    const healthStats = getHealthStats();
    const stats = getFilteredSummary();
    const managers = data?.managers || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-700 font-medium animate-pulse">Cargando Control AMA Evolutivos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                        Control AMA Evolutivos
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-4 italic">Control de evolutivos de AM</p>
                    <p className="text-gray-600 mt-1 ml-4">Gestión y seguimiento de evolutivos del proyecto AMA</p>
                </div>

                {/* Manager Filter */}
                <div className="ml-4">
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-all">
                        <User className="w-5 h-5 text-blue-600" />
                        <select
                            className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer pr-2"
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                        >
                            <option value="">Todos los Gestores</option>
                            <option value="unassigned">⚠️ Sin asignar</option>
                            {managers.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Stats Grid - Hitos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Vencidas"
                    count={stats.expired}
                    icon={<AlertTriangle className="w-8 h-8" />}
                    color="red"
                    href={`/ama-evolutivos/list/expired?manager=${selectedManager}`}
                />
                <StatCard
                    title="Para Hoy"
                    count={stats.today}
                    icon={<Calendar className="w-8 h-8" />}
                    color="amber"
                    href={`/ama-evolutivos/list/today?manager=${selectedManager}`}
                />
                <StatCard
                    title="Próximos 7 Días"
                    count={stats.upcoming}
                    icon={<Clock className="w-8 h-8" />}
                    color="blue"
                    href={`/ama-evolutivos/list/upcoming?manager=${selectedManager}`}
                />
                <StatCard
                    title="No Planificados"
                    count={stats.unplanned}
                    icon={<ListTodo className="w-8 h-8" />}
                    color="purple"
                    href={`/ama-evolutivos/list/unplanned?manager=${selectedManager}`}
                />
            </div>

            {/* Evolutivos Section */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900">Evolutivos en Curso</h3>
                    <p className="text-gray-600 mt-1">Gestión de desarrollos planificados y alertas</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CategoryCard
                        title="Planificados"
                        subtitle="Con hitos definidos"
                        count={evolutivoStats.planned}
                        icon={<Layers className="w-8 h-8" />}
                        href="/ama-evolutivos/evolutivos/planificados"
                        theme="green"
                    />
                    <CategoryCard
                        title="No Planificados"
                        subtitle="Sin hitos / Alertas"
                        count={evolutivoStats.unplanned}
                        icon={<AlertTriangle className="w-8 h-8" />}
                        href="/ama-evolutivos/evolutivos/sin-planificar"
                        theme="orange"
                    />
                </div>
            </div>

            {/* Project Health */}
            <Link href="/ama-evolutivos/avances" className="block group">
                <div className={`rounded-2xl p-6 border-2 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between
                ${healthStats.percent >= 80 ? 'bg-emerald-50 border-emerald-100' :
                        healthStats.percent >= 60 ? 'bg-orange-50 border-orange-100' :
                            'bg-red-50 border-red-100'
                    }
             `}>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                       ${healthStats.percent >= 80 ? 'bg-emerald-100 text-emerald-600' :
                                healthStats.percent >= 60 ? 'bg-orange-100 text-orange-600' :
                                    'bg-red-100 text-red-600'}`}>
                            <ListTodo className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-bold mb-1 ${healthStats.percent >= 80 ? 'text-emerald-800' :
                                healthStats.percent >= 60 ? 'text-orange-800' :
                                    'text-red-800'
                                }`}>
                                {healthStats.percent}% Salud Presupuestaria
                            </h2>
                            <p className={`${healthStats.percent >= 80 ? 'text-emerald-600' :
                                healthStats.percent >= 60 ? 'text-orange-600' :
                                    'text-red-600'
                                }`}>
                                Proyectos en tiempo ({healthStats.label}). Click para detalle.
                            </p>
                        </div>
                    </div>

                    <div className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide bg-white/50 border border-white/20
                     ${healthStats.percent >= 80 ? 'text-emerald-700' :
                            healthStats.percent >= 60 ? 'text-orange-700' :
                                'text-red-700'
                        }`}>
                        VER DETALLE
                    </div>
                </div>
            </Link>
        </div>
    );
}
