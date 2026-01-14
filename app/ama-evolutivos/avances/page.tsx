'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    CircleDot
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { JiraIssue } from '@/lib/ama-evolutivos/types';
import { cn } from '@/lib/utils';

export default function AvancesPage() {
    const router = useRouter();
    const [evolutivos, setEvolutivos] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);

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
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const estimatedList = evolutivos.filter(evo => (evo.timeoriginalestimate || 0) > 0);
    const totalEst = estimatedList.reduce((acc, curr) => acc + (curr.timeoriginalestimate || 0), 0);
    const totalSpent = estimatedList.reduce((acc, curr) => acc + (curr.timespent || 0), 0);
    const globalPercent = totalEst > 0 ? Math.round((totalSpent / totalEst) * 100) : 0;

    const healthyCount = estimatedList.filter(evo => (evo.timespent || 0) <= (evo.timeoriginalestimate || 0)).length;
    const healthPercent = estimatedList.length > 0 ? Math.round((healthyCount / estimatedList.length) * 100) : 100;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Navbar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Dashboard Principal
                    </button>

                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-bold">
                        <TrendingUp className="w-4 h-4" />
                        SEGUIMIENTO PRESUPUESTARIO
                    </div>
                </div>

                {/* Global Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                            <Clock className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium font-mono uppercase tracking-tight">Total Estimado</p>
                            <p className="text-2xl font-black text-gray-900">{totalEst} <span className="text-sm font-medium text-gray-400">horas</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                            <CircleDot className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium font-mono uppercase tracking-tight">Total Consumido</p>
                            <p className="text-2xl font-black text-gray-900">{totalSpent} <span className="text-sm font-medium text-gray-400">horas</span></p>
                        </div>
                    </div>

                    <div className={cn(
                        "p-6 rounded-2xl border shadow-sm flex items-center gap-5",
                        healthPercent >= 80 ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"
                    )}>
                        <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center border",
                            healthPercent >= 80 ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-orange-100 text-orange-600 border-orange-200"
                        )}>
                            {healthPercent >= 80 ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                        </div>
                        <div>
                            <p className="text-sm opacity-70 font-medium font-mono uppercase tracking-tight">Salud Global</p>
                            <p className="text-2xl font-black">{healthPercent}% <span className="text-sm font-medium opacity-60">en tiempo</span></p>
                        </div>
                    </div>
                </div>

                {/* Detailed List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Estado por Evolutivo</h2>
                            <p className="text-sm text-gray-500">Solo proyectos con estimación original definida</p>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {estimatedList.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 italic">No hay evolutivos con estimaciones de tiempo para mostrar.</p>
                            </div>
                        )}

                        {estimatedList.map((evo) => {
                            const spent = evo.timespent || 0;
                            const est = evo.timeoriginalestimate || 0;
                            const progress = Math.min(Math.round((spent / est) * 100), 100);
                            const isOver = spent > est;
                            const statusColor = isOver ? 'red' : progress >= 85 ? 'amber' : 'emerald';

                            return (
                                <div key={evo.key} className="p-6 hover:bg-gray-50/50 transition-colors group">
                                    <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                                        <div className="lg:w-1/4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">{evo.key}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    evo.status === 'Cerrado' || evo.status === 'Done' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {evo.status}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                                                {evo.summary}
                                            </h3>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" /> Est: {est}h
                                                    </span>
                                                    <span className={cn("flex items-center gap-1", isOver ? "text-red-600 font-black" : "text-gray-900")}>
                                                        {isOver ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                        Gastado: {spent}h
                                                    </span>
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    isOver ? "text-red-700" : progress >= 85 ? "text-amber-700" : "text-emerald-700"
                                                )}>
                                                    {isOver ? `DESVÍO: +${spent - est}h` : `RESTANTE: ${est - spent}h`}
                                                </span>
                                            </div>

                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-1000",
                                                        isOver ? "bg-red-500" : progress >= 85 ? "bg-amber-500" : "bg-emerald-500"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center px-1">
                                                <div className="flex gap-4">
                                                    {evo.gestor && (
                                                        <div className="flex items-center gap-1.5 grayscale opacity-70">
                                                            <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden text-[10px] flex items-center justify-center font-bold">
                                                                {evo.gestor.avatarUrl ? <img src={evo.gestor.avatarUrl} alt="" /> : evo.gestor.name[0]}
                                                            </div>
                                                            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">{evo.gestor.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium">Actualizado: {evo.updated ? format(new Date(evo.updated), 'dd/MM/yy HH:mm') : '-'}</p>
                                            </div>
                                        </div>

                                        <div className="lg:w-48 flex justify-end">
                                            <a
                                                href={`https://altim.atlassian.net/browse/${evo.key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full lg:w-auto px-4 py-2.5 bg-gray-900 text-white rounded-xl text-center text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                            >
                                                Ver en Jira
                                                <ArrowUpRight className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
