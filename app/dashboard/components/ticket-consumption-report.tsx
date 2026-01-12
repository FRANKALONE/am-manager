"use client";

import React, { useState, useMemo } from "react";
import { formatShortDate, formatDate } from "@/lib/date-utils";
import { getTicketWorklogs, getBulkWorklogsForExport } from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/lib/use-translations";

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
    const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
    const [ticketWorklogs, setTicketWorklogs] = useState<Record<string, any[]>>({});
    const [loadingWorklogs, setLoadingWorklogs] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);

    const hasAdvancedAccess = isAdmin || data.isPremium;

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

    const toggleTicket = async (ticketKey: string) => {
        const isExpanding = !expandedTickets.has(ticketKey);
        const newExpanded = new Set(expandedTickets);

        if (isExpanding) {
            newExpanded.add(ticketKey);
            // If premium/admin, fetch detailed worklogs if not already present
            if (hasAdvancedAccess && !ticketWorklogs[ticketKey]) {
                setLoadingWorklogs(prev => new Set(prev).add(ticketKey));
                try {
                    const logs = await getTicketWorklogs(data.wpId || validityPeriods?.[0]?.workPackageId, ticketKey, selectedPeriodId);
                    setTicketWorklogs(prev => ({ ...prev, [ticketKey]: logs }));
                } catch (error) {
                    console.error("Error loading ticket worklogs:", error);
                } finally {
                    setLoadingWorklogs(prev => {
                        const next = new Set(prev);
                        next.delete(ticketKey);
                        return next;
                    });
                }
            }
        } else {
            newExpanded.delete(ticketKey);
        }
        setExpandedTickets(newExpanded);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTickets(new Set(filteredTickets.map((t: any) => t.issueKey)));
        } else {
            setSelectedTickets(new Set());
        }
    };

    const toggleSelection = (ticketKey: string) => {
        const next = new Set(selectedTickets);
        if (next.has(ticketKey)) {
            next.delete(ticketKey);
        } else {
            next.add(ticketKey);
        }
        setSelectedTickets(next);
    };

    const handleExportExcel = async () => {
        if (selectedTickets.size === 0) return;
        setExporting(true);

        try {
            const ticketKeys = Array.from(selectedTickets);
            const bulkLogs = await getBulkWorklogsForExport(data.wpId || validityPeriods?.[0]?.workPackageId, ticketKeys, selectedPeriodId);

            // Create styled HTML for Excel
            const SMA_GREEN = "#58D68D";
            const SMA_DARK = "#008580";

            let html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
                    <style>
                        table { border-collapse: collapse; font-family: Calibri, sans-serif; }
                        th { background-color: ${SMA_GREEN}; color: white; border: 1px solid #ddd; padding: 8px; text-align: left; }
                        td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
                        .ticket-header { background-color: #f2f2f2; font-weight: bold; }
                        .ticket-summary { background-color: ${SMA_DARK}; color: white; font-weight: bold; }
                        .worklog-header { background-color: #ebf5fb; font-style: italic; font-weight: bold; }
                        .total-row { font-weight: bold; background-color: #e8f8f5; }
                    </style>
                </head>
                <body>
                    <h2>Información de Consumo Detallado</h2>
                    <p>Periodo: ${data.periodLabel || 'N/A'}</p>
                    <br/>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('dashboard.ticketsReport.issueId')}</th>
                                <th>${t('dashboard.ticketsReport.description')}</th>
                                <th>${t('dashboard.ticketsReport.type')}</th>
                                <th>${t('dashboard.ticketsReport.status')}</th>
                                <th>${t('dashboard.ticketsReport.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            ticketKeys.forEach(key => {
                const ticket = filteredTickets.find((t: any) => t.issueKey === key);
                if (!ticket) return;

                // Main Ticket Header Row
                html += `
                    <tr class="ticket-summary">
                        <td>${ticket.issueKey}</td>
                        <td>${ticket.issueSummary}</td>
                        <td>${ticket.issueType || '-'}</td>
                        <td>${ticket.issueStatus}</td>
                        <td align="right">${ticket.totalHours.toFixed(2).replace('.', ',')}h</td>
                    </tr>
                `;

                // Worklogs Detail Sub-table header
                const logs = bulkLogs[key] || [];
                if (logs.length > 0) {
                    html += `
                        <tr class="worklog-header">
                            <td></td>
                            <td>${t('dashboard.details.author')}</td>
                            <td>${t('dashboard.details.date')}</td>
                            <td>${t('dashboard.details.imputationType')}</td>
                            <td>${t('dashboard.details.hours')}</td>
                        </tr>
                    `;

                    logs.forEach(log => {
                        html += `
                            <tr>
                                <td></td>
                                <td>${log.author}</td>
                                <td>${formatDate(log.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td>${log.tipoImputacion || '-'}</td>
                                <td align="right">${log.timeSpentHours.toFixed(2).replace('.', ',')}h</td>
                            </tr>
                        `;
                    });
                }

                // Spacer row
                html += `<tr><td colspan="5" style="border:none; height:10px;"></td></tr>`;
            });

            html += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            const blob = new Blob(["\ufeff" + html], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Reporte_Consumo_Detallado_${new Date().getTime()}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setExporting(false);
        }
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
                        <div className="text-sm text-muted-foreground mr-2">
                            <span className="font-medium">{filteredTickets.length}</span> {t('dashboard.ticketsReport.totalTickets')} •
                            <span className="font-medium ml-1">
                                {formatRate(filteredTickets.reduce((sum: number, t: any) => sum + t.totalHours, 0), 2)}h
                            </span> {t('dashboard.ticketsReport.totalHours')}
                        </div>
                        {hasAdvancedAccess && filteredTickets.length > 0 && (
                            <Button
                                onClick={handleExportExcel}
                                disabled={selectedTickets.size === 0 || exporting}
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                {t('dashboard.details.exportExcel')}
                                {selectedTickets.size > 0 && ` (${selectedTickets.size})`}
                            </Button>
                        )}
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
                                {hasAdvancedAccess && (
                                    <th className="h-10 px-4 text-center w-10">
                                        <Checkbox
                                            checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                )}
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
                                        className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${expandedTickets.has(ticket.issueKey) ? 'bg-muted/10' : ''}`}
                                        onClick={() => toggleTicket(ticket.issueKey)}
                                    >
                                        {hasAdvancedAccess && (
                                            <td className="p-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedTickets.has(ticket.issueKey)}
                                                    onCheckedChange={() => toggleSelection(ticket.issueKey)}
                                                />
                                            </td>
                                        )}
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
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 whitespace-nowrap">
                                                {ticket.issueStatus}
                                            </span>
                                        </td>
                                        <td className="p-3 px-4 text-right font-bold">
                                            {formatRate(ticket.totalHours, 2)}h
                                        </td>
                                    </tr>
                                    {expandedTickets.has(ticket.issueKey) && (
                                        <tr>
                                            <td colSpan={hasAdvancedAccess ? 9 : 8} className="p-0 bg-muted/20">
                                                <div className="p-4">
                                                    {hasAdvancedAccess ? (
                                                        <>
                                                            <div className="flex items-center justify-between mb-3 pb-1 border-b">
                                                                <h5 className="text-xs font-bold text-[#008580] uppercase tracking-wider">
                                                                    Detalle de Imputaciones (Worklogs)
                                                                </h5>
                                                                <span className="text-[10px] text-muted-foreground italic">
                                                                    Exclusivo Premium/Management
                                                                </span>
                                                            </div>
                                                            {loadingWorklogs.has(ticket.issueKey) ? (
                                                                <div className="flex items-center justify-center py-8">
                                                                    <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
                                                                </div>
                                                            ) : ticketWorklogs[ticket.issueKey] && ticketWorklogs[ticket.issueKey].length > 0 ? (
                                                                <div className="rounded border bg-card overflow-hidden">
                                                                    <table className="w-full text-[11px]">
                                                                        <thead className="bg-[#f8f9fa] border-b">
                                                                            <tr>
                                                                                <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">{t('dashboard.details.author')}</th>
                                                                                <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">{t('dashboard.details.date')}</th>
                                                                                <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">{t('dashboard.details.imputationType')}</th>
                                                                                <th className="px-3 py-1.5 text-right font-semibold text-muted-foreground">{t('dashboard.details.hours')}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {ticketWorklogs[ticket.issueKey].map((log, lIdx) => (
                                                                                <tr key={lIdx} className="border-b last:border-0 hover:bg-muted/50">
                                                                                    <td className="px-3 py-1">{log.author}</td>
                                                                                    <td className="px-3 py-1">{formatDate(log.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                                                    <td className="px-3 py-1">
                                                                                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[9px]">
                                                                                            {log.tipoImputacion || '-'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right font-medium">{log.timeSpentHours.toFixed(2)}h</td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr className="bg-[#f0f9f4] font-bold">
                                                                                <td colSpan={3} className="px-3 py-1 text-right border-t">TOTAL {ticket.issueKey}:</td>
                                                                                <td className="px-3 py-1 text-right border-t">{ticket.totalHours.toFixed(2)}h</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-center py-4 text-muted-foreground italic">No hay detalles disponibles</p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
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
                                                        </>
                                                    )}
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
