'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
    ChevronLeft,
    Calendar,
    User,
    AlertTriangle,
    Clock,
    ListTodo,
    ExternalLink,
    Filter,
    X,
    RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardData, JiraIssue } from '@/lib/ama-evolutivos/types';
import { cn } from '@/lib/utils';
import { DropdownFilter } from '@/components/ama-evolutivos/dropdown-filter';

const CATEGORY_NAMES: Record<string, string> = {
    expired: 'Hitos Vencidos',
    today: 'Hitos para Hoy',
    upcoming: 'Próximos 7 Días',
    unplanned: 'Sin Planificar',
};

const CATEGORY_SUBTITLES: Record<string, string> = {
    expired: 'Hitos cuya fecha de entrega ya ha pasado.',
    today: 'Hitos que deben entregarse el día de hoy.',
    upcoming: 'Hitos programados para los próximos 7 días.',
    unplanned: 'Hitos futuros o sin fecha crítica inminente.',
};

const CATEGORY_ICONS: Record<string, any> = {
    expired: AlertTriangle,
    today: Calendar,
    upcoming: Clock,
    unplanned: ListTodo,
};

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string; icon: string }> = {
    expired: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-600' },
    today: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600' },
    upcoming: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600' },
    unplanned: { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-600' },
};

export default function HitosListPage() {
    const params = useParams();
    const category = params.category as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const managerFilterParam = searchParams.get('manager');

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter States
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

    // Exclusion States
    const [excludeMode, setExcludeMode] = useState({
        status: false,
        org: false,
        gestor: false,
        assignee: false
    });

    // UI States
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ama-evolutivos/issues');
            if (!res.ok) throw new Error('Error al cargar datos');
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const issues = useMemo(() => {
        if (!data) return [];
        let list = (data.issues[category as keyof typeof data.issues] || []) as JiraIssue[];

        // Pre-filter by Manager Param (from Dashboard link)
        if (managerFilterParam && managerFilterParam !== 'unassigned') {
            list = list.filter((i) => i.gestor?.id === managerFilterParam);
        } else if (managerFilterParam === 'unassigned') {
            list = list.filter((i) => !i.gestor || !i.gestor.id);
        }

        return list;
    }, [data, category, managerFilterParam]);

    // Extract Unique Options for filters
    const filterOptions = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort();
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name).filter(Boolean) as string[])).sort();
        const assignees = Array.from(new Set(issues.map(i => i.assignee?.displayName).filter(Boolean) as string[])).sort();

        return { statuses, orgs, gestors, assignees };
    }, [issues]);

    // Apply Filter Logic
    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
                if (selected.length === 0) return true;
                return isExclude ? !selected.includes(value) : selected.includes(value);
            };

            // 1. Status
            if (!checkFilter(selectedStatuses, issue.status, excludeMode.status)) return false;

            // 2. Organization
            if (!checkFilter(selectedOrgs, issue.organization || 'Sin organización', excludeMode.org)) return false;

            // 3. Gestor
            if (!checkFilter(selectedGestors, issue.gestor?.name || 'Sin gestor', excludeMode.gestor)) return false;

            // 4. Assignee
            if (!checkFilter(selectedAssignees, issue.assignee?.displayName || 'Sin asignar', excludeMode.assignee)) return false;

            return true;
        });
    }, [issues, selectedStatuses, selectedOrgs, selectedGestors, selectedAssignees, excludeMode]);

    const getJiraUrl = (key: string) => {
        const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'https://altim.atlassian.net';
        return `${domain}/browse/${key}`;
    };

    const clearFilters = () => {
        setSelectedStatuses([]);
        setSelectedOrgs([]);
        setSelectedGestors([]);
        setSelectedAssignees([]);
        setExcludeMode({ status: false, org: false, gestor: false, assignee: false });
    };

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0;

    const theme = CATEGORY_COLORS[category] || { text: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600' };
    const Icon = CATEGORY_ICONS[category] || ListTodo;

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-[95rem] mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 shadow-sm transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className={cn("flex items-center gap-2 mb-1", theme.text)}>
                                <Icon className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">{category.toUpperCase()}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">{CATEGORY_NAMES[category] || 'Listado'}</h1>
                            <p className="text-gray-500">{CATEGORY_SUBTITLES[category]}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {managerFilterParam && (
                            <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm shadow-sm">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-gray-500">Filtrado: </span>
                                <span className="font-bold text-gray-900">
                                    {managerFilterParam === 'unassigned' ? 'Sin asignar' : data?.managers.find(m => m.id === managerFilterParam)?.name || 'Gestor'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={fetchList}
                            className="p-3 bg-white text-gray-600 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
                            title="Actualizar lista"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-400 mr-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

                    <DropdownFilter
                        label="Estado"
                        options={filterOptions.statuses.map(s => ({ value: s, label: s }))}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                        isOpen={activeDropdown === 'status'}
                        onToggle={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
                        isExcluded={excludeMode.status}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, status: !prev.status }))}
                    />

                    <DropdownFilter
                        label="Organización"
                        options={filterOptions.orgs.map(o => ({ value: o, label: o }))}
                        selected={selectedOrgs}
                        onChange={setSelectedOrgs}
                        isOpen={activeDropdown === 'org'}
                        onToggle={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'org' ? null : 'org'); }}
                        searchable
                        isExcluded={excludeMode.org}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, org: !prev.org }))}
                    />

                    <DropdownFilter
                        label="Gestor"
                        options={filterOptions.gestors.map(g => ({ value: g, label: g }))}
                        selected={selectedGestors}
                        onChange={setSelectedGestors}
                        isOpen={activeDropdown === 'gestor'}
                        onToggle={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'gestor' ? null : 'gestor'); }}
                        isExcluded={excludeMode.gestor}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, gestor: !prev.gestor }))}
                    />

                    <DropdownFilter
                        label="Responsable"
                        options={filterOptions.assignees.map(a => ({ value: a, label: a }))}
                        selected={selectedAssignees}
                        onChange={setSelectedAssignees}
                        isOpen={activeDropdown === 'assignee'}
                        onToggle={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }}
                        isExcluded={excludeMode.assignee}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, assignee: !prev.assignee }))}
                    />

                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <X className="w-3.5 h-3.5" />
                            Limpiar Filtros
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5">Hito / Tarea</th>
                                    <th className="px-6 py-5">Evolutivo (Padre)</th>
                                    <th className="px-6 py-5">Organización</th>
                                    <th className="px-6 py-5 text-center">Estado</th>
                                    <th className="px-6 py-5">Gestor / Responsable</th>
                                    <th className="px-8 py-5 text-right">Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-16 text-center text-gray-400 italic">
                                            {issues.length === 0 ? "No hay tareas en esta categoría." : "No se encontraron resultados para tus filtros."}
                                        </td>
                                    </tr>
                                ) : filteredIssues.map((issue) => {
                                    const isOverdue = issue.dueDate && new Date(issue.dueDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] && !['Cerrado', 'Done', 'Finalizado'].includes(issue.status);

                                    return (
                                        <tr key={issue.key} className="hover:bg-gray-50/50 transition-colors group">
                                            {/* Summary */}
                                            <td className="px-8 py-5">
                                                <div className="flex items-start gap-4">
                                                    <div className={cn("mt-1 p-2 rounded-xl bg-opacity-10", theme.bg, theme.icon)}>
                                                        <ListTodo className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-base mb-1 line-clamp-2 leading-tight">{issue.summary}</p>
                                                        <a
                                                            href={getJiraUrl(issue.key)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 px-2 py-0.5 rounded transition-all inline-flex items-center gap-1"
                                                        >
                                                            {issue.key}
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Parent */}
                                            <td className="px-6 py-5">
                                                {issue.parent ? (
                                                    <div className="flex flex-col gap-1 max-w-[220px]">
                                                        <p className="text-gray-900 font-bold text-sm line-clamp-2 leading-snug" title={issue.parent.summary}>{issue.parent.summary}</p>
                                                        <a
                                                            href={getJiraUrl(issue.parent.key)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                                                        >
                                                            {issue.parent.key}
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-30" />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">Sin padre</span>
                                                )}
                                            </td>

                                            {/* Org */}
                                            <td className="px-6 py-5">
                                                {issue.organization ? (
                                                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{issue.organization}</span>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">Sin org.</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-5 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                                                    ['Cerrado', 'Done', 'Finalizado'].includes(issue.status) ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                        ['In Progress', 'En curso'].includes(issue.status) ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                                            "bg-gray-100 text-gray-600 border border-gray-200"
                                                )}>
                                                    {issue.status}
                                                </span>
                                            </td>

                                            {/* Gestor / Responsable */}
                                            <td className="px-6 py-5">
                                                <div className="space-y-3">
                                                    {/* Gestor */}
                                                    <div className="flex items-center gap-2 group/person">
                                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                                            {issue.gestor?.avatarUrl ? (
                                                                <img src={issue.gestor.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col leading-none">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Gestor</span>
                                                            <span className="text-sm font-bold text-gray-700 truncate max-w-[140px]">{issue.gestor?.name || 'Sin gestor'}</span>
                                                        </div>
                                                    </div>
                                                    {/* Assignee */}
                                                    <div className="flex items-center gap-2 group/person">
                                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                                            {issue.assignee?.avatarUrl ? (
                                                                <img src={issue.assignee.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col leading-none">
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Responsable</span>
                                                            <span className="text-sm font-bold text-gray-700 truncate max-w-[140px]">{issue.assignee?.displayName || 'Sin asignar'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Deadline */}
                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                <div className={cn(
                                                    "inline-flex flex-col items-end gap-1 px-4 py-2 rounded-2xl border font-bold shadow-sm transition-all",
                                                    isOverdue ? "bg-red-50 text-red-700 border-red-100" : "bg-white text-gray-700 border-gray-100"
                                                )}>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className={cn("w-3.5 h-3.5", isOverdue ? "text-red-500" : "text-blue-500")} />
                                                        <span className="text-sm">{issue.dueDate ? format(new Date(issue.dueDate), "dd MMM yyyy", { locale: es }) : 'N/A'}</span>
                                                    </div>
                                                    {isOverdue && <span className="text-[9px] uppercase tracking-tighter text-red-500">Tarea Vencida</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
