"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { getMonthlyDetails } from "@/app/actions/dashboard";
import { TicketDetailView } from "./ticket-detail-view";
import { Button } from "@/components/ui/button";

interface MonthlyRowProps {
    month: any;
    wpId: string;
    idx: number;
    scopeUnit?: string;
    isEventos?: boolean;
    permissions: Record<string, boolean>;
    selectedWorklogs: any[];
    onWorklogSelect: (worklog: any, isSelected: boolean) => void;
    onRequestReview?: () => void;
}

export function ExpandableMonthlyRow({
    month,
    wpId,
    idx,
    scopeUnit = 'HORAS',
    isEventos = false,
    permissions,
    selectedWorklogs,
    onWorklogSelect,
    onRequestReview
}: MonthlyRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [details, setDetails] = useState<any>({ ticketTypes: [], regularizations: [] });
    const [loading, setLoading] = useState(false);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

    const isExceeded = month.monthlyBalance < 0;
    const isAccumExceeded = month.accumulated < 0;

    // Extract year and month number from month string (format: "MM/YYYY" e.g., "02/2025")
    const getYearMonth = () => {
        if (month.month && month.month.includes('/')) {
            const [m, y] = month.month.split('/');
            const monthNum = parseInt(m);
            const year = parseInt(y);
            return { year, month: monthNum };
        }
        return null;
    };

    const handleToggle = async () => {
        if (!isOpen && details.ticketTypes.length === 0 && details.regularizations.length === 0) {
            setLoading(true);
            const ym = getYearMonth();
            if (ym) {
                const data = await getMonthlyDetails(wpId, ym.year, ym.month);
                setDetails(data);
            }
            setLoading(false);
        }
        setIsOpen(!isOpen);
    };

    const toggleType = (type: string) => {
        const newExpanded = new Set(expandedTypes);
        if (newExpanded.has(type)) {
            newExpanded.delete(type);
        } else {
            newExpanded.add(type);
        }
        setExpandedTypes(newExpanded);
    };

    // Group worklogs by ticket within a type
    const groupByTicket = (worklogs: any[]) => {
        const grouped: Record<string, any[]> = {};
        worklogs.forEach(w => {
            if (!grouped[w.issueKey]) {
                grouped[w.issueKey] = [];
            }
            grouped[w.issueKey].push(w);
        });
        return grouped;
    };

    return (
        <>
            <tr
                className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${month.isFuture ? 'opacity-40 bg-muted/10' : ''}`}
                onClick={handleToggle}
            >
                <td className="p-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {month.month}
                    </div>
                </td>
                <td className="p-3 px-4 text-right text-muted-foreground">{month.contracted.toFixed(1)}</td>
                <td className="p-3 px-4 text-right font-bold">{month.consumed > 0 ? month.consumed.toFixed(2) : '-'}</td>
                <td className={`p-3 px-4 text-right ${isExceeded ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                    {month.monthlyBalance.toFixed(1)}
                </td>
                {permissions.view_costs && (
                    <td className="p-3 px-4 text-right text-blue-600 font-medium">
                        {month.regularization ? month.regularization.toFixed(2) : '-'}
                    </td>
                )}
                {!isEventos && (
                    <td className={`p-3 px-4 text-right border-l ${isAccumExceeded ? 'text-red-700 bg-red-50/50 font-bold' : 'text-green-700 font-bold'}`}>
                        {!month.isFuture ? month.accumulated.toFixed(1) : '-'}
                    </td>
                )}
            </tr>

            {isOpen && (
                <tr>
                    <td colSpan={isEventos ? (permissions.view_costs ? 5 : 4) : (permissions.view_costs ? 6 : 5)} className="p-0 bg-muted/20">
                        {isEventos ? (
                            // Show ticket detail view for Events WP
                            <TicketDetailView
                                wpId={wpId}
                                year={month.year}
                                month={parseInt(month.month.split('/')[0])}
                            />
                        ) : (
                            // Show worklog details for non-Events WP
                            <div className="p-4 space-y-3">
                                {loading && <p className="text-sm text-muted-foreground">Cargando detalles...</p>}

                                {!loading && (!details.ticketTypes || details.ticketTypes.length === 0) && (!details.regularizations || details.regularizations.length === 0) && (
                                    <p className="text-sm text-muted-foreground">No hay worklogs ni regularizaciones para este mes</p>
                                )}

                                {/* Level 1: Ticket Types Summary - Always visible when expanded */}
                                {!loading && details.ticketTypes && details.ticketTypes.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm mb-3">Desglose por Tipo de Ticket:</h4>
                                        {details.ticketTypes.map((typeData: any) => (
                                            <div key={typeData.type} className="border rounded-lg bg-card">
                                                {/* Ticket Type Header - Clickable to expand tickets */}
                                                <div
                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                                                    onClick={() => toggleType(typeData.type)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {expandedTypes.has(typeData.type) ?
                                                            <ChevronDown className="h-4 w-4" /> :
                                                            <ChevronRight className="h-4 w-4" />
                                                        }
                                                        <span className="font-medium">{typeData.type}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({typeData.ticketCount} tickets)
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">{typeData.totalHours.toFixed(2)}h</span>
                                                </div>

                                                {expandedTypes.has(typeData.type) && (
                                                    <div className="border-t p-3 space-y-3 bg-muted/30">
                                                        {Object.entries(groupByTicket(typeData.worklogs)).map(([ticketKey, worklogs]: [string, any]) => {
                                                            const ticketTotal = worklogs.reduce((sum: number, w: any) => sum + w.timeSpentHours, 0);
                                                            const summary = worklogs[0].issueSummary;
                                                            const hasOtherMonths = worklogs[0].hasOtherMonths || false;
                                                            const portalUrl = typeData.portalUrl;

                                                            return (
                                                                <div key={ticketKey} className="border rounded bg-card p-3 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                {portalUrl ? (
                                                                                    <a
                                                                                        href={`${portalUrl}/browse/${ticketKey}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="font-medium text-sm text-primary hover:underline"
                                                                                    >
                                                                                        {ticketKey}
                                                                                    </a>
                                                                                ) : (
                                                                                    <span className="font-medium text-sm">{ticketKey}</span>
                                                                                )}
                                                                                {hasOtherMonths && (
                                                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                                                        Consumo en otros meses
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground">{summary}</p>
                                                                        </div>
                                                                        <span className="font-semibold text-sm">{ticketTotal.toFixed(2)}h</span>
                                                                    </div>
                                                                    {permissions.request_review && worklogs.some((w: any) => selectedWorklogs.some(sw => sw.id === w.id)) && (
                                                                        <div className="flex justify-start mt-1">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 font-bold"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onRequestReview?.();
                                                                                }}
                                                                            >
                                                                                <Clock className="w-3 h-3 mr-1" />
                                                                                Solicitar Revisión
                                                                            </Button>
                                                                        </div>
                                                                    )}

                                                                    {/* Worklog Details Table */}
                                                                    <table className="w-full text-xs">
                                                                        <thead className="bg-muted/50">
                                                                            <tr className="border-b">
                                                                                {permissions.request_review && <th className="p-2 w-8"></th>}
                                                                                <th className="p-2 text-left">Fecha</th>
                                                                                {!worklogs[0]?.tipoImputacion?.includes('Evolutivo') && <th className="p-2 text-left">Autor</th>}
                                                                                <th className="p-2 text-left">Tipo Imputación</th>
                                                                                <th className="p-2 text-right">Horas</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {worklogs.map((w: any, i: number) => {
                                                                                const isSelected = selectedWorklogs.some(sw => sw.id === w.id);
                                                                                const isEvolutivo = w.tipoImputacion?.includes('Evolutivo');
                                                                                return (
                                                                                    <tr key={i} className={`border-b last:border-0 ${isSelected ? 'bg-primary/5' : ''}`}>
                                                                                        {permissions.request_review && (
                                                                                            <td className="p-2 text-center">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                                                                                    checked={isSelected}
                                                                                                    onChange={(e) => onWorklogSelect(w, e.target.checked)}
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                />
                                                                                            </td>
                                                                                        )}
                                                                                        <td className="p-2">{new Date(w.startDate).toLocaleDateString('es-ES')}</td>
                                                                                        {!isEvolutivo && <td className="p-2">{w.author}</td>}
                                                                                        <td className="p-2">{w.tipoImputacion || '-'}</td>
                                                                                        <td className="p-2 text-right font-medium">{w.timeSpentHours.toFixed(2)}h</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Regularizations Section */}
                                {!loading && details.regularizations && details.regularizations.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                            <span className="text-primary">Regularizaciones y Ajustes</span>
                                        </h4>
                                        <div className="border rounded-lg bg-blue-50/30 border-blue-100">
                                            <table className="w-full text-sm">
                                                <thead className="bg-blue-100/30">
                                                    <tr className="border-b border-blue-100">
                                                        <th className="p-3 text-left font-medium text-blue-900 w-24">Fecha</th>
                                                        <th className="p-3 text-left font-medium text-blue-900 w-40">Tipo</th>
                                                        <th className="p-3 text-left font-medium text-blue-900">Descripción</th>
                                                        <th className="p-3 text-right font-medium text-blue-900 w-24">Cantidad</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {details.regularizations.map((reg: any) => {
                                                        const isNegative = reg.type === 'MANUAL_CONSUMPTION';
                                                        const isNeutral = reg.type === 'RETURN';

                                                        return (
                                                            <tr key={reg.id} className="border-b last:border-0 border-blue-100">
                                                                <td className="p-3 whitespace-nowrap">{new Date(reg.date).toLocaleDateString('es-ES')}</td>
                                                                <td className="p-3 font-medium text-xs uppercase tracking-wider text-blue-800">
                                                                    {reg.type.replace(/_/g, ' ')}
                                                                </td>
                                                                <td className="p-3 text-muted-foreground">{reg.description}</td>
                                                                <td className={`p-3 text-right font-bold ${isNegative ? 'text-red-600' : 'text-green-700'}`}>
                                                                    {isNegative ? '-' : '+'}{reg.quantity.toFixed(1)}h
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}
