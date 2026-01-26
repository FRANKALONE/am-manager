"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Calendar, User, ArrowLeft, ArrowRight, RefreshCw, X,
    CheckCircle2, Circle, Clock, Rocket, ShieldAlert,
    FlaskConical, AlertTriangle, Hourglass, BarChart,
    ChevronLeft, ChevronRight
} from "lucide-react";
import {
    format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
    isToday, isBefore, differenceInDays, isValid, addMonths,
    subMonths, eachWeekOfInterval, isSameWeek, startOfWeek,
    differenceInWeeks
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TimelineProps {
    evolutivo: any;
    hitos: any[];
    isAdmin: boolean;
    portalUrl: string | null;
}

export function EvolutivoTimeline({ evolutivo, hitos, isAdmin, portalUrl }: TimelineProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
    const [monthsToShow, setMonthsToShow] = useState<1 | 3>(1);
    const [hoveredTooltip, setHoveredTooltip] = useState<any | null>(null);

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

    const renderIssueLink = (key: string, hito?: any, className?: string) => {
        const clientJiraId = hito?.clientJiraId;
        const url = isAdmin
            ? `https://altim.atlassian.net/browse/${key}`
            : portalUrl
                ? `${portalUrl}/browse/${clientJiraId || key}`
                : null;
        const displayText = clientJiraId ? `${clientJiraId} (${key})` : key;

        if (url) {
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className={cn("hover:underline cursor-pointer", className)}>
                    {displayText}
                </a>
            );
        }
        return <span className={className}>{displayText}</span>;
    };

    const getStatusVariant = (status: string) => {
        const s = status.toLowerCase();
        if (s === "cerrado" || s === "done" || s === "closed" || s === "finalizado") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        if (isBefore(parseISO(evolutivo.latestDeadline), new Date()) && !isToday(parseISO(evolutivo.latestDeadline))) return "bg-red-500/20 text-red-400 border-red-500/30";
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    };

    return (
        <div className="space-y-6">
            {/* Evolutivo Main Card */}
            <Card className="border-t-4 border-t-jade bg-white shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-jade hover:bg-jade/90 text-white border-none">{evolutivo.status}</Badge>
                                <span className="text-sm font-mono font-bold text-slate-400">
                                    {renderIssueLink(evolutivo.issueKey, evolutivo)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{evolutivo.issueSummary}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                {evolutivo.billingMode || 'Modo no definido'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                        {/* Metrics */}
                        {(evolutivo.billingMode?.includes("T&M") || evolutivo.billingMode === "Facturable") && (
                            <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                <div className="bg-amber-100 p-2 rounded-md"><Hourglass className="w-4 h-4 text-amber-600" /></div>
                                <div>
                                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-none">Tiempo Acumulado</div>
                                    <div className="text-lg font-bold text-amber-900">{evolutivo.accumulatedHours?.toFixed(2) || '0.00'} <span className="text-xs font-normal">h</span></div>
                                </div>
                            </div>
                        )}
                        {(evolutivo.billingMode === "Facturable" || evolutivo.billingMode === "Bolsa de Horas") && (
                            <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                <div className="bg-blue-100 p-2 rounded-md"><BarChart className="w-4 h-4 text-blue-600" /></div>
                                <div>
                                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none">Estimación Original</div>
                                    <div className="text-lg font-bold text-blue-900">{evolutivo.originalEstimate?.toFixed(2) || '0.00'} <span className="text-xs font-normal">h</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Timeline Gantt Section */}
            <Card className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Controls */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
                            title="Mes anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h2 className="text-sm font-bold text-slate-700 capitalize w-40 text-center">
                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
                            title="Mes siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-200/50 p-1 rounded-lg mr-4">
                            <button onClick={() => setViewMode('day')} className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", viewMode === 'day' ? "bg-white shadow-sm text-jade" : "text-slate-500 hover:text-slate-700")}>DÍA</button>
                            <button onClick={() => setViewMode('week')} className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", viewMode === 'week' ? "bg-white shadow-sm text-jade" : "text-slate-500 hover:text-slate-700")}>SEM</button>
                        </div>
                        <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            <button onClick={() => setMonthsToShow(1)} className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", monthsToShow === 1 ? "bg-white shadow-sm text-teal" : "text-slate-500")}>1M</button>
                            <button onClick={() => setMonthsToShow(3)} className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", monthsToShow === 3 ? "bg-white shadow-sm text-teal" : "text-slate-500")}>3M</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative min-h-[400px]">
                    <div className="min-w-max">
                        {/* Sticky Header */}
                        <div className="flex sticky top-0 z-30 shadow-sm bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                            <div className="w-64 flex-shrink-0 p-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider border-r border-slate-100 bg-white sticky left-0 z-40">
                                Hitos del Evolutivo
                            </div>
                            <div className="flex">
                                {timeSlots.map(slot => (
                                    <div key={slot.toISOString()} className={cn("flex-shrink-0 text-center text-[9px] py-3 border-r border-slate-100/50", (viewMode === 'day' && isToday(slot)) || (viewMode === 'week' && isSameWeek(slot, new Date(), { weekStartsOn: 1 })) ? "bg-jade/10 font-bold text-jade" : "text-slate-400")} style={{ width: `${COL_WIDTH}px` }}>
                                        {viewMode === 'day' ? (
                                            <>{format(slot, 'd')}<br />{format(slot, 'EEEEE', { locale: es })}</>
                                        ) : (
                                            <>{format(slot, 'w')}<br />{format(slot, 'MMM', { locale: es })}</>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="divide-y divide-slate-100">
                            {hitos.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-400 italic sticky left-0 w-full">
                                    No se han definido hitos para este evolutivo.
                                </div>
                            ) : (
                                hitos.map((hito) => {
                                    const dueDate = hito.dueDate ? parseISO(hito.dueDate) : null;
                                    const rawStart = hito.startDate; // Assuming your data might have this or use custom logic
                                    const startDateObj = rawStart ? parseISO(rawStart) : dueDate;
                                    const isBar = rawStart && dueDate && isBefore(startDateObj, dueDate);

                                    return (
                                        <div key={hito.issueKey} className="flex hover:bg-slate-50 transition-colors group relative">
                                            <div className="w-64 flex-shrink-0 p-4 border-r border-slate-100 bg-white sticky left-0 z-30 group-hover:bg-slate-50 transition-colors">
                                                <p className="font-bold text-xs text-slate-800 truncate" title={hito.issueSummary}>{hito.issueSummary}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-jade font-mono font-bold">{hito.issueKey}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium truncate max-w-[100px]">{hito.assignee || 'Sin asignar'}</span>
                                                </div>
                                            </div>

                                            <div className="flex relative items-center">
                                                {timeSlots.map(slot => (
                                                    <div key={slot.toISOString()} className={cn("flex-shrink-0 border-r border-slate-50 min-h-[60px]", (viewMode === 'day' && isToday(slot)) || (viewMode === 'week' && isSameWeek(slot, new Date(), { weekStartsOn: 1 })) ? "bg-jade/5" : "")} style={{ width: `${COL_WIDTH}px` }} />
                                                ))}

                                                {/* Hito Marker/Bar */}
                                                {dueDate && startDateObj && (
                                                    (() => {
                                                        const isClosed = hito.status === 'Cerrado' || hito.status === 'Finalizado' || hito.status === 'Done';
                                                        const isOverdue = !isClosed && isBefore(dueDate, new Date()) && !isToday(dueDate);

                                                        let startIdx, durationUnits;
                                                        if (viewMode === 'day') {
                                                            const s = startDateObj < startDate ? startDate : startDateObj;
                                                            const e = dueDate > endDate ? endDate : dueDate;
                                                            startIdx = differenceInDays(s, startDate);
                                                            durationUnits = isBar ? Math.max(1, differenceInDays(e, s) + 1) : 1;
                                                        } else {
                                                            const s = startOfWeek(startDateObj < startDate ? startDate : startDateObj, { weekStartsOn: 1 });
                                                            const e = startOfWeek(dueDate > endDate ? endDate : dueDate, { weekStartsOn: 1 });
                                                            startIdx = differenceInWeeks(s, startOfWeek(startDate, { weekStartsOn: 1 }));
                                                            durationUnits = isBar ? Math.max(1, differenceInWeeks(e, s) + 1) : 1;
                                                        }

                                                        if (startIdx < 0 || startIdx >= timeSlots.length) return null;

                                                        const leftPos = startIdx * COL_WIDTH;
                                                        const width = durationUnits * COL_WIDTH;

                                                        return (
                                                            <div
                                                                className={cn(
                                                                    "absolute h-6 rounded-full shadow-sm cursor-pointer hover:brightness-110 transition-all z-20 flex items-center px-3 border",
                                                                    isClosed ? "bg-emerald-500 border-emerald-600 text-white" :
                                                                        isOverdue ? "bg-red-500 border-red-600 text-white animate-pulse" :
                                                                            "bg-blue-500 border-blue-600 text-white"
                                                                )}
                                                                style={{ left: `${leftPos + 4}px`, width: isBar ? `${width - 8}px` : 'auto', minWidth: isBar ? undefined : '120px' }}
                                                                onMouseEnter={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setHoveredTooltip({ x: rect.left + rect.width / 2, y: rect.top, data: hito });
                                                                }}
                                                                onMouseLeave={() => setHoveredTooltip(null)}
                                                            >
                                                                <span className="text-[9px] font-bold truncate drop-shadow-sm">
                                                                    {isBar && width < 100 ? '' : hito.issueSummary}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Floating Tooltip */}
            {hoveredTooltip && (
                <div
                    className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 w-64 bg-slate-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl shadow-2xl border border-white/10"
                    style={{ left: hoveredTooltip.x, top: hoveredTooltip.y - 10 }}
                >
                    <p className="font-bold text-sm mb-2">{hoveredTooltip.data.issueSummary}</p>
                    <div className="space-y-2 mb-3 text-white/80">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-luminous-green" />
                            <span>Vencimiento: {hoveredTooltip.data.dueDate ? format(parseISO(hoveredTooltip.data.dueDate), 'dd/MM/yyyy') : 'Sin fecha'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-luminous-green" />
                            <span>{hoveredTooltip.data.assignee || 'Sin asignar'}</span>
                        </div>
                    </div>
                    <div className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/20")}>
                        {hoveredTooltip.data.status}
                    </div>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                </div>
            )}
        </div>
    );
}

