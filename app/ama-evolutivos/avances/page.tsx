'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Clock,
    AlertCircle,
    CheckCircle2,
    Filter,
    X,
    User,
    ChevronDown,
    ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownFilter } from '@/components/ama-evolutivos/DropdownFilter';
import { WorklogModal } from '@/components/ama-evolutivos/WorklogModal';

interface JiraIssue {
    id: string;
    key: string;
    summary: string;
    status: string;
    assignee?: {
        accountId: string;
        displayName: string;
        avatarUrl?: string;
    };
    organization?: string;
    billingMode?: string;
    gestor?: {
        id: string;
        name: string;
        avatarUrl?: string;
    };
    timeoriginalestimate: number;
    timespent: number;
    url: string;
}

export default function AvancesPage() {
    const router = useRouter();
    const [evolutivos, setEvolutivos] = useState<JiraIssue[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [ticketFilter, setTicketFilter] = useState('');

    // Toggle filters
    const [showNoLogged, setShowNoLogged] = useState(false);
    const [showNoEstimate, setShowNoEstimate] = useState(false);
    const [showCriticalOnly, setShowCriticalOnly] = useState(false);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [selectedWorklogIssue, setSelectedWorklogIssue] = useState<JiraIssue | null>(null);

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

    // Helper for percentage
    const getProgress = (issue: JiraIssue) => {
        const estimated = issue.timeoriginalestimate || 0;
        const logged = issue.timespent || 0;
        if (estimated === 0) return logged > 0 ? 999 : 0;
        return (logged / estimated) * 100;
    };

    // Filter options
    const options = useMemo(() => {
        const statuses = Array.from(new Set(evolutivos.map(i => i.status))).sort();
        const gestors = Array.from(new Set(evolutivos.map(i => i.gestor?.name || 'Sin Gestor'))).sort();
        const assignees = Array.from(new Set(evolutivos.map(i => i.assignee?.displayName).filter(Boolean))).sort() as string[];
        return { statuses, gestors, assignees };
    }, [evolutivos]);

    // Filtered issues
    const filteredIssues = useMemo(() => {
        let result = evolutivos.filter(issue => {
            // Text search
            if (ticketFilter && !issue.key.toLowerCase().includes(ticketFilter.toLowerCase()) && !issue.summary.toLowerCase().includes(ticketFilter.toLowerCase())) {
                return false;
            }

            // Dropdown filters
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(issue.status)) return false;
            if (selectedGestors.length > 0 && !selectedGestors.includes(issue.gestor?.name || 'Sin Gestor')) return false;
            if (selectedAssignees.length > 0 && (!issue.assignee?.displayName || !selectedAssignees.includes(issue.assignee.displayName))) return false;

            // EXCLUDE billing modes
            const EXCLUDED_BILLING_MODES = ['T&M contra bolsa', 'T&M Facturable'];
            if (!issue.billingMode || EXCLUDED_BILLING_MODES.includes(issue.billingMode)) return false;

            // Toggle filters
            if (showNoLogged && (issue.timespent || 0) === 0) return false;
            if (showNoEstimate && (issue.timeoriginalestimate || 0) === 0) return false;
            if (showCriticalOnly && getProgress(issue) <= 100) return false;

            return true;
        });

        // Sort by progress DESC
        result.sort((a, b) => getProgress(b) - getProgress(a));
        return result;
    }, [evolutivos, ticketFilter, selectedStatuses, selectedGestors, selectedAssignees, showNoLogged, showNoEstimate, showCriticalOnly]);

    const hasFilters = selectedStatuses.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0 || ticketFilter || showNoLogged || showNoEstimate || showCriticalOnly;

    // Global stats
    const estimatedList = filteredIssues.filter(evo => (evo.timeoriginalestimate || 0) > 0);
    const totalEst = estimatedList.reduce((acc, curr) => acc + (curr.timeoriginalestimate || 0), 0);
    const totalSpent = estimatedList.reduce((acc, curr) => acc + (curr.timespent || 0), 0);
    const healthyCount = estimatedList.filter(evo => (evo.timespent || 0) <= (evo.timeoriginalestimate || 0)).length;
    const healthPercent = estimatedList.length > 0 ? Math.round((healthyCount / estimatedList.length) * 100) : 100;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Dashboard Principal
                    </button>

                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-bold">
                        <Clock className="w-4 h-4" />
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
                            <p className="text-2xl font-black text-gray-900">{(totalEst / 3600).toFixed(0)} <span className="text-sm font-medium text-gray-400">horas</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                            <Clock className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium font-mono uppercase tracking-tight">Total Consumido</p>
                            <p className="text-2xl font-black text-gray-900">{(totalSpent / 3600).toFixed(0)} <span className="text-sm font-medium text-gray-400">horas</span></p>
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
                            {healthPercent >= 80 ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                        </div>
                        <div>
                            <p className="text-sm opacity-70 font-medium font-mono uppercase tracking-tight">Salud Global</p>
                            <p className="text-2xl font-black">{healthPercent}% <span className="text-sm font-medium opacity-60">en tiempo</span></p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 w-48"
                        value={ticketFilter}
                        onChange={(e) => setTicketFilter(e.target.value)}
                    />

                    <DropdownFilter
                        label="Estado"
                        options={options.statuses.map(s => ({ value: s, label: s }))}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                        isOpen={activeDropdown === 'status'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
                    />

                    <DropdownFilter
                        label="Gestor"
                        options={options.gestors.map(g => ({ value: g, label: g }))}
                        selected={selectedGestors}
                        onChange={setSelectedGestors}
                        isOpen={activeDropdown === 'gestor'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'gestor' ? null : 'gestor'); }}
                    />

                    <DropdownFilter
                        label="Responsable"
                        options={options.assignees.map(a => ({ value: a, label: a }))}
                        selected={selectedAssignees}
                        onChange={setSelectedAssignees}
                        isOpen={activeDropdown === 'assignee'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }}
                    />

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    {/* Quick Toggles */}
                    <button
                        onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${showCriticalOnly
                            ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-200'
                            : 'bg-white text-red-500 border-red-100 hover:bg-red-50'
                            }`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Proyectos Críticos
                    </button>

                    <button
                        onClick={() => setShowNoLogged(!showNoLogged)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showNoLogged
                            ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        Ocultar Sin Imputar
                    </button>

                    <button
                        onClick={() => setShowNoEstimate(!showNoEstimate)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showNoEstimate
                            ? 'bg-slate-800 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        Ocultar Sin Estimación
                    </button>

                    {hasFilters && (
                        <button
                            onClick={() => {
                                setSelectedStatuses([]);
                                setSelectedGestors([]);
                                setSelectedAssignees([]);
                                setTicketFilter('');
                                setShowNoLogged(false);
                                setShowNoEstimate(false);
                                setShowCriticalOnly(false);
                            }}
                            className="ml-auto px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Limpiar
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-end text-sm font-medium text-slate-500">
                    Mostrando <span className="font-bold text-indigo-600 mx-1">{filteredIssues.length}</span> proyectos
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIssues.map(issue => {
                        const estimatedSeconds = issue.timeoriginalestimate || 0;
                        const loggedSeconds = issue.timespent || 0;
                        const estimatedHours = estimatedSeconds / 3600;
                        const loggedHours = loggedSeconds / 3600;

                        let percentage = 0;
                        if (estimatedHours > 0) {
                            percentage = (loggedHours / estimatedHours) * 100;
                        } else if (loggedHours > 0) {
                            percentage = 100;
                        }

                        const barWidth = Math.min(100, percentage);
                        const progressColor = percentage > 100 ? 'bg-red-500' : 'bg-green-500';

                        return (
                            <div key={issue.key} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                                {percentage > 100 && (
                                    <div className="absolute top-0 right-0 p-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${issue.status === 'Cerrado' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {issue.status}
                                        </span>
                                        <a
                                            href={issue.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-xs text-slate-400 hover:text-indigo-500 hover:underline transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {issue.key}
                                        </a>
                                    </div>
                                    <h3 className="font-bold text-slate-700 line-clamp-2 h-12" title={issue.summary}>{issue.summary}</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 font-medium text-slate-500">
                                            <span>Progreso Presupuesto</span>
                                            <span>{percentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${barWidth}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Data Points */}
                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Estimado</p>
                                            <p className="text-xl font-bold text-slate-700">{estimatedHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">h</span></p>
                                        </div>
                                        <div
                                            className="cursor-pointer group hover:bg-slate-50 -m-2 p-2 rounded-lg transition-colors"
                                            onClick={() => setSelectedWorklogIssue(issue)}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Imputado</p>
                                                <ChevronDown className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <p className={`text-xl font-bold ${loggedHours > estimatedHours ? 'text-red-500' : 'text-indigo-600'}`}>
                                                {loggedHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">h</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Assignee */}
                                <div className="mt-4 pt-4 flex items-center gap-2 text-xs text-slate-500">
                                    <User className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{issue.assignee?.displayName || 'Sin Asignar'}</span>
                                </div>
                            </div>
                        );
                    })}

                    {filteredIssues.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400">
                            <Clock className="w-12 h-12 mb-4 opacity-20" />
                            <p>No se encontraron proyectos con los filtros actuales.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <WorklogModal issue={selectedWorklogIssue} onClose={() => setSelectedWorklogIssue(null)} />
        </div>
    );
}
