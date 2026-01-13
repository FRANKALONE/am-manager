"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight, CheckCircle2, Circle, Clock, Rocket, ShieldAlert, FlaskConical, AlertTriangle, Hourglass, BarChart } from "lucide-react";
import { formatShortDate } from "@/lib/date-utils";

interface TimelineProps {
    evolutivo: any;
    hitos: any[];
    isAdmin: boolean;
    portalUrl: string | null;
}

export function EvolutivoTimeline({ evolutivo, hitos, isAdmin, portalUrl }: TimelineProps) {
    const isKeyMilestone = (summary: string) => {
        const keywords = [
            "entrega en des", "entrega en qas", "entrega para pruebas",
            "entrega en pro", "entrega en prd", "subida a pro",
            "despliegue", "paso a pro"
        ];
        const lowerSummary = summary.toLowerCase();
        return keywords.some(k => lowerSummary.includes(k));
    };

    const getIcon = (summary: string, status: string) => {
        const lowerSummary = summary.toLowerCase();
        if (lowerSummary.includes("pro") || lowerSummary.includes("prd")) return <Rocket className="w-5 h-5" />;
        if (lowerSummary.includes("qas") || lowerSummary.includes("pruebas")) return <FlaskConical className="w-5 h-5" />;
        if (lowerSummary.includes("des")) return <ArrowRight className="w-5 h-5" />;

        if (status === "Cerrado" || status === "Done" || status === "Closed") return <CheckCircle2 className="w-5 h-5" />;
        if (status === "En Tratamiento" || status === "In Progress") return <Clock className="w-5 h-5" />;

        return <Circle className="w-5 h-5" />;
    };

    const getStatusVariant = (status: string) => {
        const s = status.toLowerCase();
        if (s === "cerrado" || s === "done" || s === "closed") return "success";
        if (s === "en tratamiento" || s === "in progress") return "warning";
        if (s === "reabierto" || s === "reopened") return "destructive";
        return "default";
    };

    const renderIssueLink = (key: string, hito?: any, className?: string) => {
        const clientJiraId = hito?.clientJiraId;

        // Determine URL based on user role
        const url = isAdmin
            ? `https://altim.atlassian.net/browse/${key}`
            : portalUrl
                ? `${portalUrl}/browse/${clientJiraId || key}`
                : null;

        // Determine display text
        const displayText = clientJiraId
            ? `${clientJiraId} (${key})`
            : key;

        if (url) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:underline cursor-pointer ${className}`}
                >
                    {displayText}
                </a>
            );
        }
        return <span className={className}>{displayText}</span>;
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-8">
                {/* Evolutivo Main Card */}
                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
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
                        {(evolutivo.billingMode === "T&M contra bolsa" || evolutivo.billingMode === "T&M Facturable") && (
                            <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                <div className="bg-amber-100 p-2 rounded-md">
                                    <Hourglass className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-none">Tiempo Acumulado (Corregido)</div>
                                    <div className="text-lg font-bold text-amber-900">{evolutivo.accumulatedHours?.toFixed(2) || '0.00'} <span className="text-xs font-normal">horas</span></div>
                                </div>
                            </div>
                        )}

                        {(evolutivo.billingMode === "Facturable" || evolutivo.billingMode === "Bolsa de Horas") && (
                            <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                <div className="bg-blue-100 p-2 rounded-md">
                                    <BarChart className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider leading-none">Estimación Original</div>
                                    <div className="text-lg font-bold text-blue-900">{evolutivo.originalEstimate?.toFixed(2) || '0.00'} <span className="text-xs font-normal">horas</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline Section */}
                {evolutivo.pendingPlanning ? (
                    <div className="bg-amber-50 border border-amber-200 p-8 rounded-xl flex flex-col items-center justify-center text-center">
                        <div className="bg-amber-100 p-3 rounded-full mb-4">
                            <AlertTriangle className="w-8 h-8 text-amber-600" />
                        </div>
                        <h4 className="text-lg font-bold text-amber-900 mb-1">Pendiente de planificar</h4>
                        <p className="text-sm text-amber-700 max-w-md">
                            Este evolutivo no cuenta con hitos definidos o los hitos actuales no tienen fechas de vencimiento asignadas en JIRA.
                        </p>
                    </div>
                ) : (
                    <div className="relative pl-8 md:pl-0">
                        {/* Desktop Central Line */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 -translate-x-1/2 rounded-full" />

                        {/* Mobile Left Line */}
                        <div className="md:hidden absolute left-3 top-0 bottom-0 w-1 bg-slate-100 rounded-full" />

                        <div className="space-y-12">
                            {hitos.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 italic">
                                    No se han definido hitos para este evolutivo.
                                </div>
                            ) : (
                                hitos.map((hito, index) => {
                                    const isKey = isKeyMilestone(hito.issueSummary);
                                    const side = index % 2 === 0 ? 'left' : 'right';

                                    return (
                                        <div key={hito.issueKey} className="relative group">
                                            {/* Timeline Node */}
                                            <div className={`absolute top-0 w-8 h-8 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center transition-transform group-hover:scale-110 
                                                ${side === 'left' ? 'md:left-1/2 md:-translate-x-1/2' : 'md:left-1/2 md:-translate-x-1/2'} 
                                                left-0 -translate-x-[2px] md:-translate-x-[14px]
                                                ${isKey ? 'bg-jade text-white ring-4 ring-jade/20' : 'bg-white text-slate-400'}
                                            `}>
                                                {getIcon(hito.issueSummary, hito.status)}
                                            </div>

                                            {/* Card content */}
                                            <div className={`flex flex-col ${side === 'left' ? 'md:items-end' : 'md:items-start'} ml-10 md:ml-0`}>
                                                <div className={`w-full md:w-[42%] bg-white p-5 rounded-xl border shadow-sm transition-all hover:shadow-md 
                                                    ${isKey ? 'border-jade/30 bg-jade/5' : 'hover:border-slate-300'}
                                                    ${side === 'left' ? 'md:mr-[58%]' : 'md:ml-[58%]'}
                                                `}>
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {renderIssueLink(hito.issueKey, hito)}
                                                                </div>
                                                                <h4 className={`font-bold leading-tight ${isKey ? 'text-jade' : 'text-slate-800'}`}>
                                                                    {hito.issueSummary}
                                                                </h4>
                                                            </div>
                                                            <Badge variant={getStatusVariant(hito.status) as any} className="text-[10px]">
                                                                {hito.status}
                                                            </Badge>
                                                        </div>

                                                        <div className={`flex flex-wrap gap-4 text-sm ${side === 'left' ? 'md:justify-end' : 'md:justify-start'}`}>
                                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span>
                                                                    {hito.dueDate
                                                                        ? formatShortDate(hito.dueDate)
                                                                        : 'Sin fecha'}
                                                                </span>
                                                            </div>
                                                            <div className={`flex items-center gap-1.5 text-slate-500`}>
                                                                <User className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[120px]">{hito.assignee || 'Sin asignar'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
