"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/lib/use-translations";
import { formatShortDate } from "@/lib/date-utils";

interface TicketConsumptionReportProps {
    data: any;
    validityPeriods?: any[];
    selectedPeriodId?: number;
    onPeriodChange?: (periodId: number) => void;
    isAdmin: boolean;
}

export function TicketConsumptionReport({ data, validityPeriods, selectedPeriodId, onPeriodChange, isAdmin }: TicketConsumptionReportProps) {
    const { t, locale } = useTranslations();
    const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
    const [filterTicketId, setFilterTicketId] = useState("");
    const [filterType, setFilterType] = useState("all");

    // Get unique ticket types for filter - MUST be before early return
    const ticketTypes = useMemo(() => {
        if (!data || !data.tickets || data.tickets.length === 0) return [];
        const types = new Set(data.tickets.map((t: any) => t.issueType));
        return Array.from(types).sort();
    }, [data]);

    // Filter tickets - MUST be before early return
    const filteredTickets = useMemo(() => {
        if (!data || !data.tickets || data.tickets.length === 0) return [];
        return data.tickets.filter((ticket: any) => {
            const matchesId = filterTicketId === "" ||
                ticket.issueKey.toLowerCase().includes(filterTicketId.toLowerCase());
            const matchesType = filterType === "all" || ticket.issueType === filterType;
            return matchesId && matchesType;
        });
    }, [data, filterTicketId, filterType]);

    const toggleTicket = (ticketKey: string) => {
        const newExpanded = new Set(expandedTickets);
        if (newExpanded.has(ticketKey)) {
            newExpanded.delete(ticketKey);
        } else {
            newExpanded.add(ticketKey);
        }
        setExpandedTickets(newExpanded);
    };

    const renderSlaBadge = (ticket: any, slaValue: string | null, slaTime: string | null) => {
        if (!slaValue) return null;

        const slaTicketTypes = ["Incidencia de correctivo", "Consulta", "Solicitud de servicio", "Soporte AM"].map(t => t.toLowerCase().trim());
        const slaPriorities = ["Muy Alta", "Alta", "Media", "Baja"].map(p => p.toLowerCase().trim());

        const issueType = (ticket.issueType || "").toLowerCase().trim();
        const priority = (ticket.priority || "Media").toLowerCase().trim();

        const appliesSLA = slaTicketTypes.includes(issueType) && slaPriorities.includes(priority);

        if (!appliesSLA) return null;

        const isIncumplido = slaValue.includes("Incumplido");
        const isCumplido = slaValue.includes("Cumplido");

        const tooltip = slaTime ? `${t('dashboard.consumed')}: ${slaTime}` : t('dashboard.details.noData');

        return (
            <span
                title={tooltip}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block whitespace-nowrap cursor-help ${isIncumplido ? 'bg-red-50 text-red-700 border-red-200' :
                    isCumplido ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                {slaValue}
            </span>
        );
    };

    const formatRate = (num: number, digits: number = 2) => {
        return num.toLocaleString(locale || 'es', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    };

    if (!data || !data.tickets || data.tickets.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('dashboard.ticketsReport.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{t('dashboard.ticketsReport.noData')}</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="border-t-4 border-t-primary">
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle>{t('dashboard.ticketsReport.title')}</CardTitle>
                    <div className="flex items-center gap-4">
                        {validityPeriods && validityPeriods.length > 1 && onPeriodChange && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-muted-foreground">{t('dashboard.period')}:</label>
                                <Select
                                    value={selectedPeriodId?.toString()}
                                    onValueChange={(value) => onPeriodChange(parseInt(value))}
                                >
                                    <SelectTrigger className="w-[280px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validityPeriods.map((period: any) => (
                                            <SelectItem key={period.id} value={period.id.toString()}>
                                                {formatShortDate(period.startDate)} - {formatShortDate(period.endDate)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{filteredTickets.length}</span> {t('dashboard.ticketsReport.totalTickets')} •
                            <span className="font-medium ml-1">
                                {formatRate(filteredTickets.reduce((sum: number, t: any) => sum + t.totalHours, 0), 2)}h
                            </span> {t('dashboard.ticketsReport.totalHours')}
                        </div>
                    </div>
                </div>
                {data.periodLabel && (
                    <p className="text-xs text-muted-foreground mt-1">{t('dashboard.period')}: {data.periodLabel}</p>
                )}

                <div className="flex justify-center gap-3 mt-4">
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder={t('dashboard.ticketsReport.filterPlaceholder')}
                            value={filterTicketId}
                            onChange={(e) => setFilterTicketId(e.target.value)}
                            className="w-full h-9 px-3 text-sm border rounded-md bg-background"
                        />
                    </div>
                    <div className="w-64">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full h-9 px-3 text-sm border rounded-md bg-background"
                        >
                            <option value="all">{t('dashboard.ticketsReport.allTypes')}</option>
                            {ticketTypes.map((type) => (
                                <option key={String(type)} value={String(type)}>{String(type)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr className="border-b">
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.type')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.issueId')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.description')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.priority')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.slaResponse')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.slaResolution')}</th>
                                <th className="h-10 px-4 text-left font-medium">{t('dashboard.ticketsReport.status')}</th>
                                <th className="h-10 px-4 text-right font-medium">{t('dashboard.ticketsReport.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.map((ticket: any) => (
                                <React.Fragment key={ticket.issueKey}>
                                    <tr
                                        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                                        onClick={() => toggleTicket(ticket.issueKey)}
                                    >
                                        <td className="p-3 px-4">
                                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                                                {ticket.issueType}
                                            </span>
                                        </td>
                                        <td className="p-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {expandedTickets.has(ticket.issueKey) ?
                                                    <ChevronDown className="h-4 w-4" /> :
                                                    <ChevronRight className="h-4 w-4" />
                                                }
                                                {(() => {
                                                    const url = isAdmin
                                                        ? `https://altim.atlassian.net/browse/${ticket.issueKey}`
                                                        : data.portalUrl
                                                            ? `${data.portalUrl}/browse/${ticket.issueKey}`
                                                            : null;

                                                    if (url) {
                                                        return (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="font-medium text-primary hover:underline"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {ticket.issueKey}
                                                            </a>
                                                        );
                                                    }
                                                    return <span className="font-medium">{ticket.issueKey}</span>;
                                                })()}
                                            </div>
                                        </td>
                                        <td className="p-3 px-4 text-muted-foreground max-w-md truncate">
                                            {ticket.issueSummary}
                                        </td>
                                        <td className="p-3 px-4">
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${ticket.priority === 'Muy Alta' ? 'bg-red-100 text-red-700' :
                                                ticket.priority === 'Alta' ? 'bg-orange-100 text-orange-700' :
                                                    ticket.priority === 'Baja' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {ticket.priority || 'Media'}
                                            </span>
                                        </td>
                                        <td className="p-3 px-4">
                                            {renderSlaBadge(ticket, ticket.slaResponse, ticket.slaResponseTime)}
                                        </td>
                                        <td className="p-3 px-4">
                                            {renderSlaBadge(ticket, ticket.slaResolution, ticket.slaResolutionTime)}
                                        </td>
                                        <td className="p-3 px-4">
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                                {ticket.issueStatus}
                                            </span>
                                        </td>
                                        <td className="p-3 px-4 text-right font-bold">
                                            {formatRate(ticket.totalHours, 2)}h
                                        </td>
                                    </tr>
                                    {expandedTickets.has(ticket.issueKey) && (
                                        <tr>
                                            <td colSpan={8} className="p-0 bg-muted/20">
                                                <div className="p-4">
                                                    <h5 className="text-xs font-semibold mb-2 text-muted-foreground">
                                                        {t('dashboard.ticketsReport.monthlyBreakdown')}
                                                    </h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                        {ticket.monthlyBreakdown.map((month: any) => (
                                                            <div
                                                                key={month.month}
                                                                className="border rounded-md p-2 bg-card text-center"
                                                            >
                                                                <div className="text-xs text-muted-foreground">
                                                                    {month.month}
                                                                </div>
                                                                <div className="text-sm font-semibold">
                                                                    {formatRate(month.hours, 2)}h
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
