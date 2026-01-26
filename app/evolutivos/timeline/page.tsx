'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, Calendar, Filter, ChevronDown, RefreshCw, X, ArrowRight, User, AlertCircle, Clock, Settings, CalendarDays, CalendarRange, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DropdownFilter } from '@/components/ama-evolutivos/dropdown-filter';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, differenceInDays, isValid, isAfter, eachWeekOfInterval, differenceInWeeks, endOfWeek, startOfWeek, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TimelinePage() {
    const router = useRouter();
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter States
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
    const [selectedGestors, setSelectedGestors] = useState<string[]>([]);
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [ticketFilter, setTicketFilter] = useState('');

    // Exclusion States
    const [excludeMode, setExcludeMode] = useState({
        status: false,
        org: false,
        gestor: false,
        assignee: false
    });

    // View State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [monthsToShow, setMonthsToShow] = useState<1 | 3 | 6>(1);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Tooltip State
    const [hoveredTooltip, setHoveredTooltip] = useState<any | null>(null);

    // Fetch Data
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ama-evolutivos/evolutivos?includeChildren=true');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            setIssues(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);


    // Grid Generation
    const { startDate, endDate, timeSlots } = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(addMonths(currentMonth, monthsToShow - 1));

        let slots;
        if (viewMode === 'day') {
            slots = eachDayOfInterval({ start, end });
        } else {
            slots = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        }
        return { startDate: start, endDate: end, timeSlots: slots };
    }, [currentMonth, monthsToShow, viewMode]);

    const COL_WIDTH = viewMode === 'day' ? 40 : 100;

    // Extract Options
    const options = useMemo(() => {
        const statuses = Array.from(new Set(issues.map(i => i.status))).sort();
        const orgs = Array.from(new Set(issues.filter(i => i.organization).map(i => i.organization))).sort();
        const gestors = Array.from(new Set(issues.filter(i => i.gestor?.name).map(i => i.gestor.name))).sort() as string[];

        const assignees = new Set<string>();
        issues.forEach(i => {
            if (i.assignee?.displayName) assignees.add(i.assignee.displayName);
            if (i.children) {
                i.children.forEach((c: any) => {
                    if (c.fields.assignee?.displayName) assignees.add(c.fields.assignee.displayName);
                });
            }
        });

        return {
            statuses,
            orgs: orgs.length > 0 ? orgs : ['Sin organización'],
            gestors: gestors.length > 0 ? gestors : ['Sin gestor'],
            assignees: Array.from(assignees).sort()
        };
    }, [issues]);

    // FILTER Logic
    const filteredIssues = issues.filter(issue => {
        const checkFilter = (selected: string[], value: string, isExclude: boolean) => {
            if (selected.length === 0) return true;
            return isExclude ? !selected.includes(value) : selected.includes(value);
        };

        if (ticketFilter && !issue.key.toLowerCase().includes(ticketFilter.toLowerCase()) && !issue.summary.toLowerCase().includes(ticketFilter.toLowerCase())) {
            return false;
        }

        if (!checkFilter(selectedStatuses, issue.status, excludeMode.status)) return false;

        const orgName = issue.organization || 'Sin organización';
        if (!checkFilter(selectedOrgs, orgName, excludeMode.org)) return false;

        const gestorName = issue.gestor?.name || 'Sin gestor';
        if (!checkFilter(selectedGestors, gestorName, excludeMode.gestor)) return false;

        if (selectedAssignees.length > 0) {
            const parentMatch = issue.assignee?.displayName && checkFilter(selectedAssignees, issue.assignee.displayName, excludeMode.assignee);
            const childrenMatch = issue.children?.some((c: any) => c.fields.assignee?.displayName && checkFilter(selectedAssignees, c.fields.assignee.displayName, excludeMode.assignee));
            if (!parentMatch && !childrenMatch) return false;
        }

        return true;
    });

    const hasFilters = selectedStatuses.length > 0 || selectedOrgs.length > 0 || selectedGestors.length > 0 || selectedAssignees.length > 0 || ticketFilter;
    const finalIssues = filteredIssues;

    const getVisibleHitos = (issue: any) => {
        if (!issue.children) return [];
        let hits = issue.children;

        if (selectedAssignees.length > 0) {
            if (excludeMode.assignee) {
                hits = hits.filter((h: any) => !selectedAssignees.includes(h.fields.assignee?.displayName));
            } else {
                hits = hits.filter((h: any) => selectedAssignees.includes(h.fields.assignee?.displayName));
            }
        }
        return hits;
    };

    if (loading && issues.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sea-salt">
                <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sea-salt font-sans p-6 md:p-8" onClick={() => setActiveDropdown(null)}>
            <div className="max-w-[98rem] mx-auto space-y-6">

                {/* Header compatible with legacy style */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 shadow-sm transition-all" title="Volver">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-jade">
                                <CalendarDays className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Planificación</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Líneas Temporales</h1>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-antiflash flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-jade/70 mr-2 px-2">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Filtros:</span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-jade transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar Ticket / ID..."
                            className="bg-sea-salt border border-antiflash rounded-xl px-9 py-2 text-sm focus:outline-none focus:border-jade w-48 transition-all"
                            value={ticketFilter}
                            onChange={(e) => setTicketFilter(e.target.value)}
                        />
                    </div>

                    <DropdownFilter
                        label="Estado"
                        options={options.statuses.map(s => ({ value: s, label: s }))}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                        isOpen={activeDropdown === 'status'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'status' ? null : 'status'); }}
                        isExcluded={excludeMode.status}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, status: !prev.status }))}
                    />

                    <DropdownFilter
                        label="Organización"
                        options={options.orgs.map(o => ({ value: o, label: o }))}
                        selected={selectedOrgs}
                        onChange={setSelectedOrgs}
                        isOpen={activeDropdown === 'org'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'org' ? null : 'org'); }}
                        searchable
                        isExcluded={excludeMode.org}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, org: !prev.org }))}
                    />

                    <DropdownFilter
                        label="Gestor"
                        options={options.gestors.map(g => ({ value: g, label: g }))}
                        selected={selectedGestors}
                        onChange={setSelectedGestors}
                        isOpen={activeDropdown === 'gestor'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'gestor' ? null : 'gestor'); }}
                        isExcluded={excludeMode.gestor}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, gestor: !prev.gestor }))}
                    />

                    <DropdownFilter
                        label="Responsable"
                        options={options.assignees.map(a => ({ value: a, label: a }))}
                        selected={selectedAssignees}
                        onChange={setSelectedAssignees}
                        isOpen={activeDropdown === 'assignee'}
                        onToggle={(e: any) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }}
                        isExcluded={excludeMode.assignee}
                        onToggleExclusion={() => setExcludeMode(prev => ({ ...prev, assignee: !prev.assignee }))}
                    />

                    {hasFilters && (
                        <button
                            onClick={() => {
                                setSelectedStatuses([]); setSelectedOrgs([]); setSelectedGestors([]); setSelectedAssignees([]); setTicketFilter('');
                            }}
                            className="ml-auto px-4 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* TIMELINE VISUALIZATION */}
                <div className="bg-white rounded-[2.5rem] border border-antiflash shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-[75vh]">
                    {/* Controls */}
                    <div className="p-6 border-b border-antiflash flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-600" title="Anterior"><ChevronDown className="w-5 h-5 rotate-90" /></button>
                            <h2 className="text-xl font-bold text-slate-800 capitalize w-56 text-center tabular-nums">
                                {monthsToShow === 1
                                    ? format(currentMonth, 'MMMM yyyy', { locale: es })
                                    : `${format(startDate, 'MMM', { locale: es })} - ${format(endDate, 'MMM yyyy', { locale: es })}`
                                }
                            </h2>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-600" title="Siguiente"><ChevronDown className="w-5 h-5 -rotate-90" /></button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-antiflash">
                                <button
                                    onClick={() => setViewMode('day')}
                                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'day' ? 'bg-white shadow-md text-jade' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Día
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'week' ? 'bg-white shadow-md text-jade' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Semana
                                </button>
                            </div>

                            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-antiflash">
                                <button onClick={() => setMonthsToShow(1)} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${monthsToShow === 1 ? 'bg-white shadow-md text-jade' : 'text-slate-500'}`}>1M</button>
                                <button onClick={() => setMonthsToShow(3)} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${monthsToShow === 3 ? 'bg-white shadow-md text-jade' : 'text-slate-500'}`}>3M</button>
                                <button onClick={() => setMonthsToShow(6)} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${monthsToShow === 6 ? 'bg-white shadow-md text-jade' : 'text-slate-500'}`}>6M</button>
                            </div>

                            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-xs font-bold bg-jade/10 text-jade hover:bg-jade/20 rounded-xl transition-all">
                                Hoy
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <div className="min-w-max">
                            {/* Sticky Header Row */}
                            <div className="flex sticky top-0 z-30 shadow-md bg-slate-50/90 backdrop-blur-md border-b border-antiflash">
                                <div className="w-80 flex-shrink-0 p-5 font-bold text-xs text-slate-500 uppercase tracking-widest border-r border-antiflash bg-white z-40 sticky left-0">
                                    EVOLUTIVO
                                </div>
                                <div className="flex">
                                    {timeSlots.map(slot => (
                                        <div
                                            key={slot.toISOString()}
                                            className={`flex-shrink-0 text-center text-[10px] py-4 border-r border-antiflash/50 
                                                ${(viewMode === 'day' && isToday(slot)) || (viewMode === 'week' && isSameWeek(slot, new Date(), { weekStartsOn: 1 })) ? 'bg-jade/10 font-bold text-jade' : 'text-slate-400'}`}
                                            style={{ width: `${COL_WIDTH}px` }}
                                        >
                                            {viewMode === 'day' ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs">{format(slot, 'd')}</span>
                                                    <span className="uppercase text-[9px] opacity-60">{format(slot, 'EEE', { locale: es })}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-xs">S{format(slot, 'w')}</span>
                                                    <span className="uppercase text-[9px] opacity-60">{format(slot, 'MMM', { locale: es })}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body Rows */}
                            <div className="divide-y divide-antiflash">
                                {finalIssues.length === 0 ? (
                                    <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4 sticky left-0 w-full p-8">
                                        <div className="p-6 bg-slate-50 rounded-full border border-dashed border-slate-200">
                                            <CalendarRange className="w-12 h-12 opacity-50 text-jade" />
                                        </div>
                                        <p className="font-medium">{hasFilters ? "No se encontraron evolutivos con estos criterios." : "Selecciona filtros para visualizar el timeline."}</p>
                                    </div>
                                ) : (
                                    finalIssues.map(issue => {
                                        const visibleHitos = getVisibleHitos(issue);

                                        return (
                                            <div key={issue.key} className="flex hover:bg-slate-50 transition-colors group">
                                                <div className="w-80 flex-shrink-0 p-5 border-r border-antiflash bg-white z-30 sticky left-0 group-hover:bg-slate-50 transition-colors shadow-xl shadow-slate-200/20">
                                                    <p className="font-bold text-sm text-slate-900 truncate mb-1" title={issue.summary}>{issue.summary}</p>
                                                    <div className="flex items-center gap-2">
                                                        <a href={issue.url} target="_blank" className="text-xs text-jade font-mono font-bold hover:underline">{issue.key}</a>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{issue.status}</span>
                                                    </div>

                                                    {(() => {
                                                        const unplannedCount = (issue.children || []).filter((child: any) =>
                                                            !child.fields.duedate && child.fields.status?.name !== 'Cerrado'
                                                        ).length;

                                                        if (unplannedCount > 0) {
                                                            return (
                                                                <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 animate-pulse">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-bold">Tiene {unplannedCount} hitos por planificar</span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>

                                                <div className="flex relative">
                                                    {timeSlots.map(slot => (
                                                        <div
                                                            key={slot.toISOString()}
                                                            className={`flex-shrink-0 border-r border-antiflash/30 min-h-[80px] ${(viewMode === 'day' && isToday(slot)) || (viewMode === 'week' && isSameWeek(slot, new Date(), { weekStartsOn: 1 })) ? 'bg-jade/5' : ''}`}
                                                            style={{ width: `${COL_WIDTH}px` }}
                                                        />
                                                    ))}

                                                    {(() => {
                                                        const items = visibleHitos.map((hito: any) => {
                                                            const endDateField = hito.fields.duedate ? parseISO(hito.fields.duedate) : null;
                                                            const rawStart = hito.fields.customfield_10124;
                                                            const startDateField = rawStart ? parseISO(rawStart) : null;

                                                            if (!endDateField) return null;
                                                            const isBar = startDateField && isValid(startDateField) && (isBefore(startDateField, endDateField) || isSameDay(startDateField, endDateField));

                                                            let startIdx, durationUnits;
                                                            if (viewMode === 'day') {
                                                                const s = isBar && startDateField ? (startDateField < startDate ? startDate : startDateField) : endDateField;
                                                                const e = endDateField > endDate ? endDate : endDateField;
                                                                startIdx = differenceInDays(s, startDate);
                                                                durationUnits = isBar ? differenceInDays(e, s) + 1 : 1;
                                                            } else {
                                                                const s = startOfWeek(isBar && startDateField ? (startDateField < startDate ? startDate : startDateField) : endDateField, { weekStartsOn: 1 });
                                                                const e = startOfWeek(endDateField > endDate ? endDate : endDateField, { weekStartsOn: 1 });
                                                                startIdx = differenceInWeeks(s, startOfWeek(startDate, { weekStartsOn: 1 }));
                                                                durationUnits = isBar ? differenceInWeeks(e, s) + 1 : 1;
                                                            }

                                                            if (startIdx < 0 || startIdx >= timeSlots.length) return null;
                                                            return { hito, startIdx, durationUnits, isBar, endDateField, startDateField };
                                                        }).filter(Boolean);

                                                        items.sort((a: any, b: any) => a.startIdx - b.startIdx);
                                                        const tracks: number[] = [];
                                                        const positionedItems = items.map((item: any) => {
                                                            let trackIdx = -1;
                                                            for (let i = 0; i < tracks.length; i++) {
                                                                if (tracks[i] < item.startIdx) { trackIdx = i; break; }
                                                            }
                                                            if (trackIdx === -1) { trackIdx = tracks.length; tracks.push(-1); }
                                                            tracks[trackIdx] = item.startIdx + item.durationUnits;
                                                            return { ...item, trackIdx };
                                                        });

                                                        return positionedItems.map((m: any) => {
                                                            const { hito, startIdx, durationUnits, isBar, endDateField, trackIdx } = m;
                                                            const leftPos = startIdx * COL_WIDTH;
                                                            const width = durationUnits * COL_WIDTH;
                                                            const topOffset = 14 + (trackIdx * 28);

                                                            const isClosed = hito.fields.status?.name === 'Cerrado' || hito.fields.status?.name === 'Done';
                                                            const isOverdue = !isClosed && isBefore(endDateField, new Date()) && !isToday(endDateField);

                                                            let colorClass = 'bg-jade border-jade/50 shadow-jade/20';
                                                            if (isClosed) colorClass = 'bg-slate-400 border-slate-500 shadow-slate-200';
                                                            else if (isOverdue) colorClass = 'bg-red-500 border-red-600 shadow-red-200 animate-pulse';

                                                            return (
                                                                <div
                                                                    key={hito.key}
                                                                    className={`absolute h-5 rounded-full shadow-lg cursor-pointer hover:scale-[1.02] transition-all z-20 flex items-center border ${colorClass} ${isBar ? 'px-3' : 'w-5 p-0 justify-center'}`}
                                                                    style={{
                                                                        left: `${leftPos + (isBar ? 4 : 12)}px`,
                                                                        width: isBar ? `${width - 8}px` : '20px',
                                                                        top: `${topOffset}px`
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setHoveredTooltip({ x: rect.left + rect.width / 2, y: rect.top, data: hito });
                                                                    }}
                                                                    onMouseLeave={() => setHoveredTooltip(null)}
                                                                >
                                                                    {isBar && width > 80 && (
                                                                        <span className="text-[9px] font-bold text-white truncate drop-shadow-md tracking-tight">{hito.fields.summary}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredTooltip && (
                <div
                    className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 w-72 bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
                    style={{ left: hoveredTooltip.x, top: hoveredTooltip.y - 10 }}
                >
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <p className="font-bold text-sm leading-tight text-white/95">{hoveredTooltip.data.fields.summary}</p>
                        <span className="text-[10px] font-mono font-bold text-jade bg-jade/10 px-2 py-0.5 rounded-lg border border-jade/20 whitespace-nowrap">{hoveredTooltip.data.key}</span>
                    </div>

                    <div className="space-y-2.5 mb-4">
                        <div className="flex items-center gap-3 text-white/70">
                            <Clock className="w-4 h-4 text-jade" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Vencimiento</span>
                                <span className="text-xs font-medium">{hoveredTooltip.data.fields.duedate ? format(parseISO(hoveredTooltip.data.fields.duedate), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-white/70">
                            <User className="w-4 h-4 text-jade" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Responsable</span>
                                <span className="text-xs font-medium">{hoveredTooltip.data.fields.assignee?.displayName || 'Sin asignar'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${hoveredTooltip.data.fields.status?.name === 'Cerrado' ? 'bg-jade/20 text-jade border border-jade/30' : 'bg-white/10 text-white/80 border border-white/20'
                            }`}>
                            {hoveredTooltip.data.fields.status?.name}
                        </div>
                    </div>

                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45"></div>
                </div>
            )}
        </div>
    );
}
