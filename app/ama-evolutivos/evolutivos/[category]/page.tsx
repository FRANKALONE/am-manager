'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    Layers,
    AlertTriangle,
    User,
    ExternalLink,
    Search,
    Clock,
    PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { JiraIssue } from '@/lib/ama-evolutivos/types';
import { cn } from '@/lib/utils';

export default function EvolutivosListPage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const managerId = searchParams.get('manager') || '';

    const [evolutivos, setEvolutivos] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function fetchEvolutivos() {
            try {
                const res = await fetch('/api/ama-evolutivos/evolutivos');
                if (res.ok) {
                    const data = await res.json();
                    setEvolutivos(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchEvolutivos();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const isPlanificado = category === 'planificados';

    const filteredEvolutivos = evolutivos.filter(evo => {
        // Filter by category
        if (isPlanificado) {
            if ((evo.pendingHitos || 0) === 0) return false;
        } else {
            if ((evo.pendingHitos || 0) > 0) return false;
        }

        // Filter by manager (from query param if needed, though usually navigation from dashboard handles it)
        if (managerId) {
            if (managerId === 'unassigned') {
                if (evo.gestor && evo.gestor.id) return false;
            } else {
                if (evo.gestor?.id !== managerId) return false;
            }
        }

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                evo.key.toLowerCase().includes(search) ||
                evo.summary.toLowerCase().includes(search)
            );
        }

        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Volver al Dashboard
                    </button>
                </div>

                {/* Title and Search */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-4 rounded-2xl border",
                                isPlanificado ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-orange-600 bg-orange-50 border-orange-100"
                            )}>
                                {isPlanificado ? <Layers className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {isPlanificado ? 'Evolutivos Planificados' : 'Evolutivos Sin Planificar'}
                                </h1>
                                <p className="text-gray-600">
                                    {isPlanificado ? 'Con hitos definidos y en ejecución' : 'Sin hitos definidos o en espera de planificación'}
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar evolutivo..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Proyecto/Clave</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Resumen Evolutivo</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-center">Hitos</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-center">Avance Horas</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Gestor</th>
                                    <th className="py-4 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredEvolutivos.map((evo) => {
                                    const spent = evo.timespent || 0;
                                    const est = evo.timeoriginalestimate || 0;
                                    const progress = est > 0 ? Math.min(Math.round((spent / est) * 100), 100) : 0;
                                    const isOver = est > 0 && spent > est;

                                    return (
                                        <tr key={evo.key} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-4 text-sm">
                                                <span className="font-bold text-gray-900 block">{evo.key}</span>
                                            </td>
                                            <td className="py-4 px-4 max-w-sm">
                                                <p className="text-gray-900 font-medium truncate">{evo.summary}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        evo.status === 'Cerrado' || evo.status === 'Done' ? "bg-emerald-100 text-emerald-700" :
                                                            evo.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                    )}>
                                                        {evo.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className={cn(
                                                        "text-lg font-bold",
                                                        (evo.pendingHitos || 0) > 0 ? "text-blue-600" : "text-gray-400"
                                                    )}>
                                                        {evo.pendingHitos || 0}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-semibold italic">Pendientes</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {est > 0 ? (
                                                    <div className="space-y-1.5 min-w-[120px]">
                                                        <div className="flex justify-between text-[10px] font-semibold uppercase">
                                                            <span className={isOver ? "text-red-600" : "text-gray-500"}>
                                                                {spent}h / {est}h
                                                            </span>
                                                            <span className={isOver ? "text-red-600" : "text-blue-600"}>{progress}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-500",
                                                                    isOver ? "bg-red-500" : "bg-blue-500"
                                                                )}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs italic">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Sin estimación
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                {evo.gestor ? (
                                                    <div className="flex items-center gap-2">
                                                        {evo.gestor.avatarUrl && (
                                                            <img src={evo.gestor.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                                        )}
                                                        <span className="text-sm text-gray-700 font-medium">{evo.gestor.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No asignado</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'https://altim.atlassian.net'}/browse/${evo.key}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm font-medium text-xs"
                                                >
                                                    VER JIRA
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredEvolutivos.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500 font-medium italic">
                                            No se han encontrado evolutivos en esta categoría.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
