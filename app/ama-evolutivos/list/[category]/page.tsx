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
    RefreshCw,
    SearchX,
    Briefcase,
    ArrowRight
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
    expired: 'Hitos con fecha de entrega superada.',
    today: 'Prioridad crítica: entrega para hoy.',
    upcoming: 'Vencimientos en la próxima semana.',
    unplanned: 'Hitos en cola sin fecha crítica.',
};

const CATEGORY_ICONS: Record<string, any> = {
    expired: AlertTriangle,
    today: Calendar,
    upcoming: Clock,
    unplanned: ListTodo,
};

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string; icon: string; dot: string }> = {
    expired: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-500', dot: 'bg-red-500' },
    today: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-500', dot: 'bg-amber-500' },
    upcoming: { text: 'text-jade', bg: 'bg-mint/30', border: 'border-jade/10', icon: 'text-jade', dot: 'bg-jade' },
    unplanned: { text: 'text-prussian', bg: 'bg-sea-salt', border: 'border-antiflash', icon: 'text-prussian', dot: 'bg-prussian' },
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

        if (managerFilterParam && managerFilterParam !== 'unassigned') {
            list = list.filter((i) => i.gestor?.id === managerFilterParam);
        } else if (managerFilterParam === 'unassigned') {
            list = list.filter((i) => !i.gestor || !i.gestor.id);
        }

        return list;
    }, [data, category, managerFilterParam]);

    const filterOptions = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.map(i => i.organization || 'Sin organización'))).sort();
        const gestors = Array.from(new Set(issues.map(i => i.gestor?.name).filter(Boolean) as string[])).sort();
        const assignees = Array.from(new Set(issues.map(i => i.assignee?.displayName).filter(Boolean) as string[])).sort();

        return { statuses, orgs, gestors, assignees };
    }, [issues]);

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
                if (selected.length === 0) return true;
                return isExclude ? !selected.includes(value) : selected.includes(value);
            };

            if (!checkFilter(selectedStatuses, issue.status, excludeMode.status)) return false;
            if (!checkFilter(selectedOrgs, issue.organization || 'Sin organización', excludeMode.org)) return false;
            if (!checkFilter(selectedGestors, issue.gestor?.name || 'Sin gestor', excludeMode.gestor)) return false;
            if (!checkFilter(selectedAssignees, issue.assignee?.displayName || 'Sin asignar', excludeMode.assignee)) return false;

            return true;
        });
    }, [issues, selectedStatuses, selectedOrgs, selectedGestors, selectedAssignees, excludeMode]);

    const getJiraUrl = (key: string) => {
        const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN || 'https://altim.atlassian.net';
        return `${domain}/browse/${key}`;
    };

    const clearFilters = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedStatuses([]);
        setSelectedOrgs([]);
        setSelectedGestors([]);
        setSelectedAssignees([]);
        setExcludeMode({ status: false, org: false, gestor: false, assignee: false });
    };

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0;
    const theme = CATEGORY_COLORS[category] || { text: 'text-blue-grey', bg: 'bg-white', border: 'border-antiflash', icon: 'text-teal/40', dot: 'bg-teal/20' };
    const Icon = CATEGORY_ICONS[category] || ListTodo;

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-jade border-t-transparent rounded-full animate-spin shadow-lg shadow-jade/20"></div>
                    <p className="text-jade font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando Hitos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt p-6 md:p-10 font-sans text-blue-grey" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-[100rem] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-start gap-6">
                        <button
                            onClick={() => router.back()}
                            className="group p-4 bg-white hover:bg-sea-salt text-blue-grey rounded-2xl border border-antiflash shadow-sm hover:shadow-md transition-all active:scale-95"
                            title="Volver"
                        >
                            <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div>
                            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 border shadow-sm", theme.bg, theme.text, theme.border)}>
                                <span className={cn("w-2 h-2 rounded-full", theme.dot)} />
                                {category}
                            </div>
                            <h1 className="text-5xl font-black text-blue-grey tracking-tighter mb-2">{CATEGORY_NAMES[category] || 'Listado'}</h1>
                            <p className="text-teal/60 font-medium text-lg italic">{CATEGORY_SUBTITLES[category]}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {managerFilterParam && (
                            <div className="hidden md:flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-antiflash shadow-sm">
                                <User className="w-5 h-5 text-jade" />
                                <div>
                                    <p className="text-[10px] font-black text-teal/40 uppercase tracking-tighter leading-none mb-0.5">Vista enfocada</p>
                                    <p className="text-sm font-bold text-blue-grey">
                                        {managerFilterParam === 'unassigned' ? 'Sin asignar' : data?.managers.find(m => m.id === managerFilterParam)?.name || 'Gestor'}
                                    </p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={fetchList}
                            className="p-4 bg-prussian text-white rounded-2xl shadow-xl shadow-prussian/20 hover:bg-blue-grey transition-all active:scale-95"
                            title="Refrescar datos"
                        >
                            <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Filter Controls (Premium Bar) */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl shadow-blue-grey/5 border border-white flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 bg-sea-salt px-4 py-2 rounded-xl border border-antiflash mr-2">
                        <Filter className="w-4 h-4 text-jade" />
                        <span className="text-xs font-black uppercase tracking-widest text-teal/60">Filtros Activos</span>
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
                        label="Cliente / Org"
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
                        label="Gestor Jira"
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
                            className="ml-auto px-6 py-3 text-[10px] font-black text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl transition-all flex items-center gap-2 uppercase tracking-widest border border-red-100 shadow-sm"
                        >
                            <X className="w-4 h-4" />
                            Resetear
                        </button>
                    )}
                </div>

                {/* Main Table Content */}
                <div className="bg-white rounded-[3rem] border border-antiflash shadow-2xl shadow-blue-grey/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-sea-salt/50 text-teal/40 font-black uppercase text-[10px] tracking-[0.2em] border-b border-antiflash">
                                <tr>
                                    <th className="px-10 py-8">Detalle del Hito</th>
                                    <th className="px-8 py-8">Padre (Evolutivo)</th>
                                    <th className="px-8 py-8 text-center">Estado</th>
                                    <th className="px-8 py-8">Gestión / Ejecución</th>
                                    <th className="px-10 py-8 text-right">Deadline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-antiflash">
                                {filteredIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-32 text-center animate-in fade-in duration-700">
                                            <div className="flex flex-col items-center">
                                                <div className="bg-sea-salt p-10 rounded-[3rem] mb-6 shadow-inner">
                                                    <SearchX className="w-20 h-20 text-teal/10" />
                                                </div>
                                                <h3 className="text-2xl font-black text-blue-grey tracking-tight mb-2 uppercase">Sin coincidencias</h3>
                                                <p className="text-teal/40 font-bold italic text-base max-w-xs mx-auto">Prueba ajustando los filtros dinámicos</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredIssues.map((issue) => {
                                    const isOverdue = issue.dueDate && new Date(issue.dueDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] && !['Cerrado', 'Done', 'Finalizado'].includes(issue.status);

                                    return (
                                        <tr key={issue.key} className="hover:bg-mint/5 transition-all group border-l-4 border-l-transparent hover:border-l-jade">
                                            {/* Summary & Key */}
                                            <td className="px-10 py-8 align-top">
                                                <div className="flex items-start gap-4">
                                                    <div className={cn("mt-1 p-3 rounded-2xl bg-white shadow-md border group-hover:scale-110 transition-transform", theme.icon, theme.border)}>
                                                        <Icon className="w-5 h-5 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-blue-grey text-lg mb-2 leading-snug line-clamp-2 max-w-md group-hover:text-jade transition-colors">{issue.summary}</p>
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={getJiraUrl(issue.key)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] font-black text-prussian/60 bg-white border border-antiflash hover:border-jade hover:text-jade px-3 py-1 rounded-full transition-all flex items-center gap-2 shadow-sm"
                                                            >
                                                                {issue.key}
                                                                <ExternalLink className="w-3 h-3 opacity-40" />
                                                            </a>
                                                            {issue.organization && (
                                                                <span className="text-[10px] font-black text-teal/40 uppercase tracking-tighter bg-sea-salt px-2 py-1 rounded border border-antiflash">{issue.organization}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Parent Info */}
                                            <td className="px-8 py-8 align-top">
                                                {issue.parent ? (
                                                    <div className="flex flex-col gap-2 max-w-[280px]">
                                                        <div className="flex items-center gap-2 bg-sea-salt p-3 rounded-2xl border border-antiflash shadow-sm group-hover:bg-white transition-colors">
                                                            <Briefcase className="w-4 h-4 text-teal/30" />
                                                            <p className="text-blue-grey font-bold text-xs line-clamp-2 leading-none" title={issue.parent.summary}>{issue.parent.summary}</p>
                                                        </div>
                                                        <a
                                                            href={getJiraUrl(issue.parent.key)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-black text-teal/30 hover:text-jade transition-all flex items-center gap-1.5 ml-1"
                                                        >
                                                            {issue.parent.key}
                                                            <ArrowRight className="w-2.5 h-2.5 opacity-30" />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div className="pt-4 text-teal/10 italic text-xs font-black uppercase tracking-widest">Sin Vinculación</div>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-8 py-8 text-center align-top">
                                                <div className="pt-2">
                                                    <span className={cn(
                                                        "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ring-1 ring-inset",
                                                        ['Cerrado', 'Done', 'Finalizado'].includes(issue.status) ? "bg-emerald-50 text-emerald-600 ring-emerald-500/20" :
                                                            ['In Progress', 'En curso'].includes(issue.status) ? "bg-jade text-white ring-jade shadow-jade/20" :
                                                                "bg-white text-teal/50 ring-antiflash"
                                                    )}>
                                                        {issue.status}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* People */}
                                            <td className="px-8 py-8 align-top">
                                                <div className="space-y-4">
                                                    {/* Gestor */}
                                                    <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl border border-antiflash shadow-sm transform transition-transform group-hover:-translate-y-1 hover:shadow-md">
                                                        <img src={issue.gestor?.avatarUrl || ''} alt="" className="w-8 h-8 rounded-xl border-2 border-sea-salt shadow-sm" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-teal/40 uppercase tracking-tighter leading-none mb-0.5">Gestor</p>
                                                            <p className="text-xs font-extrabold text-blue-grey truncate max-w-[120px]">{issue.gestor?.name || 'Sin gestor'}</p>
                                                        </div>
                                                    </div>
                                                    {/* Assignee */}
                                                    <div className="flex items-center gap-3 bg-sea-salt/50 p-2 pr-4 rounded-2xl border border-antiflash transform transition-transform group-hover:translate-y-1">
                                                        <img src={issue.assignee?.avatarUrl || ''} alt="" className="w-8 h-8 rounded-xl border-2 border-white shadow-sm" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-teal/40 uppercase tracking-tighter leading-none mb-0.5">Responsable</p>
                                                            <p className="text-xs font-extrabold text-blue-grey truncate max-w-[120px]">{issue.assignee?.displayName || 'Sin asignar'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date Info */}
                                            <td className="px-10 py-8 text-right align-top whitespace-nowrap">
                                                <div className={cn(
                                                    "inline-flex flex-col items-end gap-1.5 px-6 py-4 rounded-[2rem] border font-black transition-all relative overflow-hidden",
                                                    isOverdue ? "bg-red-50 text-red-600 border-red-200 shadow-xl shadow-red-500/10" : "bg-white text-blue-grey border-antiflash shadow-sm group-hover:shadow-md"
                                                )}>
                                                    {isOverdue && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping mt-4 mr-4" />}
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className={cn("w-4 h-4", isOverdue ? "text-red-500" : "text-jade")} />
                                                        <span className="text-sm tracking-tight">{issue.dueDate ? format(new Date(issue.dueDate), "dd MMM yyyy", { locale: es }) : 'POR DEFINIR'}</span>
                                                    </div>
                                                    <div className="text-[9px] uppercase tracking-widest opacity-40">Compromiso</div>
                                                </div>
                                                {isOverdue && (
                                                    <div className="mt-2 text-[10px] font-black text-red-500 bg-red-50 rounded-full py-1 px-3 inline-flex items-center gap-1 shadow-sm border border-red-100">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        PLAZO VENCIDO
                                                    </div>
                                                )}
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
