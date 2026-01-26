'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    Layers,
    AlertTriangle,
    User,
    ExternalLink,
    Search,
    Clock,
    Zap,
    Filter,
    ArrowRight,
    SearchX
} from 'lucide-react';
import type { JiraIssue } from '@/lib/ama-evolutivos/types';
import { cn } from '@/lib/utils';

export default function EvolutivosListPage({ params }: { params: { category: string } }) {
    const { category } = params;
    const router = useRouter();
    const searchParams = useSearchParams();
    const managerIdFromUrl = searchParams.get('manager') || '';

    const [evolutivos, setEvolutivos] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [zapFocus, setZapFocus] = useState(false);

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

    const isPlanificado = category === 'planificados';

    const filteredEvolutivos = useMemo(() => {
        return evolutivos.filter(evo => {
            // Filter by category
            if (isPlanificado) {
                if ((evo.pendingHitos || 0) === 0) return false;
            } else {
                if ((evo.pendingHitos || 0) > 0) return false;
            }

            // Manager filter
            if (managerIdFromUrl) {
                if (managerIdFromUrl === 'unassigned') {
                    if (evo.gestor?.id) return false;
                } else {
                    if (evo.gestor?.id !== managerIdFromUrl) return false;
                }
            }

            // Search filter
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return (
                    evo.key.toLowerCase().includes(s) ||
                    evo.summary.toLowerCase().includes(s) ||
                    evo.gestor?.name?.toLowerCase().includes(s) ||
                    evo.responsable?.name?.toLowerCase().includes(s)
                );
            }

            return true;
        });
    }, [evolutivos, isPlanificado, managerIdFromUrl, searchTerm]);

    // Zap Focus Transformation: Group by person and sort by priority/pending
    const groupedData = useMemo(() => {
        if (!zapFocus) return null;

        const groups: Record<string, { name: string, avatar: string | null, issues: JiraIssue[] }> = {};

        filteredEvolutivos.forEach(evo => {
            const personId = evo.gestor?.id || 'unassigned';
            const personName = evo.gestor?.name || 'Sin Gestor';
            const personAvatar = evo.gestor?.avatarUrl || null;

            if (!groups[personId]) {
                groups[personId] = { name: personName, avatar: personAvatar, issues: [] };
            }
            groups[personId].issues.push(evo);
        });

        return Object.values(groups).sort((a, b) => b.issues.length - a.issues.length);
    }, [filteredEvolutivos, zapFocus]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-jade border-t-transparent rounded-full animate-spin shadow-lg shadow-jade/20"></div>
                    <p className="text-jade font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Evolutivos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt p-6 md:p-10 font-sans text-blue-grey selection:bg-jade/20">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-2 text-teal/60 hover:text-jade transition-all bg-white px-4 py-2 rounded-full border border-antiflash shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-sm font-bold uppercase tracking-wider">Dashboard</span>
                        </button>

                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "p-5 rounded-[2rem] border-2 shadow-xl shadow-opacity-10",
                                isPlanificado
                                    ? "bg-gradient-to-br from-mint to-white border-jade/20 text-jade shadow-jade/10"
                                    : "bg-gradient-to-br from-orange-50 to-white border-orange-200 text-orange-600 shadow-orange-100"
                            )}>
                                {isPlanificado ? <Layers className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-extrabold tracking-tighter text-blue-grey">
                                        {isPlanificado ? 'Evolutivos Planificados' : 'Sin Planificar'}
                                    </h1>
                                    <span className="px-3 py-1 bg-prussian text-white text-[10px] font-black rounded-full shadow-lg">
                                        {filteredEvolutivos.length}
                                    </span>
                                </div>
                                <p className="text-teal/60 font-medium text-lg italic mt-1 leading-none">
                                    {isPlanificado ? 'Proyectos con hitos activos' : 'Esperando definición de fases'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal/40 group-focus-within:text-jade transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar por clave, título o persona..."
                                className="w-full md:w-96 pl-12 pr-6 py-4 bg-white border-2 border-antiflash rounded-2xl outline-none focus:border-jade/50 focus:ring-4 focus:ring-jade/5 shadow-sm transition-all text-sm font-bold placeholder:text-teal/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setZapFocus(!zapFocus)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest",
                                    zapFocus
                                        ? "bg-prussian border-prussian text-luminous-green shadow-xl shadow-prussian/20 scale-105"
                                        : "bg-white border-antiflash text-teal/40 hover:border-teal/20"
                                )}
                            >
                                <Zap className={cn("w-4 h-4", zapFocus ? "fill-luminous-green" : "")} />
                                Zap Focus 🔮
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[3rem] border border-antiflash shadow-2xl shadow-blue-grey/5 overflow-hidden min-h-[500px]">
                    {!zapFocus ? (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-sea-salt/50 sticky top-0 z-10 backdrop-blur-md">
                                    <tr className="border-b border-antiflash">
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em]">Referencia</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em]">Detalle Evolutivo</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em] text-center">Planificación</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em] text-center">Ejecución</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em]">Asignación</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-teal/50 uppercase tracking-[0.2em] text-right">Links</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-antiflash">
                                    {filteredEvolutivos.map((evo) => {
                                        const spent = evo.timespent || 0;
                                        const est = evo.timeoriginalestimate || 0;
                                        const progress = est > 0 ? Math.min(Math.round((spent / est) * 100), 100) : 0;
                                        const isOver = est > 0 && spent > est;

                                        return (
                                            <tr key={evo.key} className="hover:bg-mint/5 transition-all group">
                                                <td className="py-6 px-8 align-top">
                                                    <span className="font-black text-blue-grey text-sm mb-1 block group-hover:text-jade transition-colors">{evo.key}</span>
                                                    <span className="text-[10px] bg-antiflash px-2 py-0.5 rounded font-black text-teal/60 uppercase tracking-tighter">{evo.projectName}</span>
                                                </td>
                                                <td className="py-6 px-8 max-w-sm align-top">
                                                    <p className="font-bold text-slate-800 leading-tight mb-2">{evo.summary}</p>
                                                    <Badge className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                                                        evo.status === 'Cerrado' || evo.status === 'Done' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                            evo.status === 'In Progress' ? "bg-jade text-white" : "bg-teal/10 text-teal/60 border-teal/20"
                                                    )}>
                                                        {evo.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-6 px-8 text-center align-top">
                                                    <div className="flex flex-col items-center">
                                                        <span className={cn(
                                                            "text-3xl font-black italic tracking-tighter",
                                                            (evo.pendingHitos || 0) > 0 ? "text-jade" : "text-teal/20"
                                                        )}>
                                                            {evo.pendingHitos || 0}
                                                        </span>
                                                        <span className="text-[9px] font-black text-teal/40 uppercase tracking-widest">Hitos</span>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-8 align-top">
                                                    {est > 0 ? (
                                                        <div className="space-y-2 pt-2">
                                                            <div className="flex justify-between items-end">
                                                                <span className={cn("text-[10px] font-black", isOver ? "text-red-500 underline decoration-2 underline-offset-4" : "text-teal/40")}>
                                                                    {spent} / {est} <span className="text-[8px] font-medium opacity-50">H/TRAB</span>
                                                                </span>
                                                                <span className={cn("text-xs font-black italic", isOver ? "text-red-500" : "text-jade")}>{progress}%</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-sea-salt rounded-full overflow-hidden border border-antiflash">
                                                                <div
                                                                    className={cn(
                                                                        "h-full transition-all duration-700 ease-out flex justify-end items-center px-1",
                                                                        isOver ? "bg-red-500 shadow-lg shadow-red-200" : "bg-jade shadow-lg shadow-jade-200"
                                                                    )}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full pt-4 text-teal/20 group-hover:text-teal/40 transition-colors">
                                                            <Filter className="w-5 h-5 mb-1 opacity-20" />
                                                            <span className="text-[10px] font-black uppercase tracking-tighter italic">N/A</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-6 px-8 align-top">
                                                    <div className="space-y-3">
                                                        {evo.gestor && (
                                                            <div className="flex items-center gap-3 bg-sea-salt/50 p-2 rounded-xl border border-antiflash transform transition-transform group-hover:-translate-y-1 shadow-sm">
                                                                <div className="relative">
                                                                    <img src={evo.gestor.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full border-2 border-white bg-white shadow-sm" />
                                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-jade rounded-full border-2 border-white flex items-center justify-center">
                                                                        <User className="w-2 h-2 text-white" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-teal/40 uppercase tracking-tighter leading-none mb-0.5">Gestor</p>
                                                                    <p className="text-xs font-bold text-blue-grey truncate max-w-[100px]">{evo.gestor.name}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-6 px-8 text-right align-top">
                                                    <button
                                                        onClick={() => router.push(`/ama-evolutivos/timeline/${evo.key}`)}
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-prussian text-white rounded-xl hover:bg-blue-grey transition-all shadow-lg shadow-prussian/10 hover:shadow-prussian/30 active:scale-95 text-[10px] font-black uppercase tracking-widest mb-2 w-full justify-center"
                                                    >
                                                        Timeline
                                                        <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                    <a
                                                        href={`${process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'https://altim.atlassian.net'}/browse/${evo.key}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal/60 border border-antiflash rounded-xl hover:bg-sea-salt transition-all shadow-sm text-[10px] font-black uppercase tracking-widest w-full justify-center"
                                                    >
                                                        Jira
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10">
                            {groupedData?.map((group) => (
                                <div key={group.name} className="flex flex-col bg-sea-salt/50 rounded-[3rem] p-6 border-2 border-antiflash hover:border-jade/30 transition-all hover:shadow-2xl hover:shadow-jade/5 group/card relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-jade translate-x-16 -translate-y-16 rotate-45 opacity-[0.03] pointer-events-none group-hover/card:opacity-[0.08] transition-opacity" />

                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="relative">
                                            <img src={group.avatar || ''} className="w-16 h-16 rounded-[2rem] shadow-xl border-4 border-white shadow-blue-grey/10" alt="" />
                                            <div className="absolute -bottom-2 -right-2 bg-jade text-white p-2 rounded-2xl border-4 border-white shadow-lg">
                                                <Zap className="w-4 h-4 fill-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-blue-grey tracking-tight leading-none mb-1">{group.name}</h3>
                                            <p className="text-[10px] font-black text-jade uppercase tracking-[0.2em]">{group.issues.length} Evolutivos</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {group.issues.slice(0, 5).map(issue => (
                                            <div
                                                key={issue.key}
                                                onClick={() => router.push(`/ama-evolutivos/timeline/${issue.key}`)}
                                                className="bg-white p-4 rounded-3xl border border-antiflash shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex justify-between items-center group/item"
                                            >
                                                <div className="max-w-[70%]">
                                                    <p className="text-[9px] font-black text-teal/40 uppercase mb-0.5">{issue.key}</p>
                                                    <p className="text-xs font-extrabold text-blue-grey truncate group-hover/item:text-jade transition-colors">{issue.summary}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black italic tracking-tighter text-jade leading-none">{issue.pendingHitos || 0}</span>
                                                    <span className="text-[8px] font-black text-teal/20 uppercase">Hitos</span>
                                                </div>
                                            </div>
                                        ))}
                                        {group.issues.length > 5 && (
                                            <p className="text-center text-[10px] font-black text-teal/30 uppercase pt-2">+{group.issues.length - 5} Más...</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredEvolutivos.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-1000">
                            <div className="bg-antiflash p-10 rounded-[3rem] mb-6">
                                <SearchX className="w-20 h-20 text-teal/20" />
                            </div>
                            <h3 className="text-3xl font-black text-blue-grey tracking-tight mb-2 uppercase">Sin coincidencias</h3>
                            <p className="text-teal/40 font-bold italic text-lg max-w-xs mx-auto">Prueba ajustando los filtros o el término de búsqueda</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </span>
    );
}

