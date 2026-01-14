"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Download, FileSpreadsheet } from "lucide-react";
import { getMonthlyDetails } from "@/app/actions/dashboard";
import { TicketDetailView } from "./ticket-detail-view";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";

interface MonthlyRowProps {
    month: any;
    wpId: string;
    idx: number;
    scopeUnit?: string;
    isEventos?: boolean;
    permissions: Record<string, boolean>;
    isAdmin?: boolean;
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
    isAdmin = false,
    selectedWorklogs,
    onWorklogSelect,
    onRequestReview
}: MonthlyRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [details, setDetails] = useState<any>({ ticketTypes: [], regularizations: [] });
    const [loading, setLoading] = useState(false);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
    const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
    const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());

    const { t, locale } = useTranslations();

    const isExceeded = month.monthlyBalance < 0;
    const isAccumExceeded = month.accumulated < 0;

    const formatRate = (num: number, digits: number = 2) => {
        return num.toLocaleString(locale || 'es', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    };

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

    const toggleTicket = (ticketKey: string) => {
        const newExpanded = new Set(expandedTickets);
        if (newExpanded.has(ticketKey)) {
            newExpanded.delete(ticketKey);
        } else {
            newExpanded.add(ticketKey);
        }
        setExpandedTickets(newExpanded);
    };

    const handleTicketSelect = (ticketKey: string, isSelected: boolean) => {
        const newSelected = new Set(selectedTickets);
        if (isSelected) {
            newSelected.add(ticketKey);
        } else {
            newSelected.delete(ticketKey);
        }
        setSelectedTickets(newSelected);
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            const allKeys = new Set<string>();
            details.ticketTypes?.forEach((typeData: any) => {
                const grouped = groupByTicket(typeData.worklogs);
                Object.keys(grouped).forEach(k => allKeys.add(k));
            });
            setSelectedTickets(allKeys);
        } else {
            setSelectedTickets(new Set());
        }
    };

    const downloadCSV = () => {
        if (selectedTickets.size === 0) return;

        const selectedWorklogs: any[] = [];
        details.ticketTypes?.forEach((typeData: any) => {
            typeData.worklogs.forEach((w: any) => {
                if (selectedTickets.has(w.issueKey)) {
                    selectedWorklogs.push(w);
                }
            });
        });

        if (selectedWorklogs.length === 0) return;

        // Header for CSV
        const headers = [
            t('dashboard.details.date'),
            t('dashboard.ticketsDetail.issueId'),
            t('dashboard.ticketsDetail.summary'),
            t('dashboard.details.author'),
            t('dashboard.details.imputationType'),
            t('dashboard.details.hours')
        ];

        const rows = selectedWorklogs.map(w => [
            formatDate(w.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' }),
            w.issueKey,
            `"${(w.issueSummary || '').replace(/"/g, '""')}"`,
            w.author || '',
            w.tipoImputacion || '',
            w.timeSpentHours.toFixed(2).replace('.', ',')
        ]);

        const csvContent = [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Detalle_Consumo_${month.month.replace('/', '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                <td className="p-3 px-4 text-right text-muted-foreground">
                    {formatRate(month.contracted, scopeUnit === 'TICKETS' ? 0 : 1)}
                </td>
                <td className="p-3 px-4 text-right font-bold">
                    {month.consumed > 0 ? formatRate(month.consumed, scopeUnit === 'TICKETS' ? 0 : 2) : '-'}
                </td>
                <td className={`p-3 px-4 text-right ${isExceeded ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                    {formatRate(month.monthlyBalance, scopeUnit === 'TICKETS' ? 0 : 1)}
                </td>
                {permissions.view_costs && (
                    <td className="p-3 px-4 text-right text-blue-600 font-medium">
                        {month.regularization ? formatRate(month.regularization, scopeUnit === 'TICKETS' ? 0 : 2) : '-'}
                    </td>
                )}
                {!isEventos && (
                    <td className={`p-3 px-4 text-right border-l ${isAccumExceeded ? 'text-red-700 bg-red-50/50 font-bold' : 'text-green-700 font-bold'}`}>
                        {!month.isFuture ? formatRate(month.accumulated, scopeUnit === 'TICKETS' ? 0 : 1) : '-'}
                    </td>
                )}
            </tr>

            {isOpen && (
                <tr>
                    <td colSpan={isEventos ? (permissions.view_costs ? 5 : 4) : (permissions.view_costs ? 6 : 5)} className="p-0 bg-muted/20">
                        {isEventos ? (
                            <TicketDetailView
                                wpId={wpId}
                                year={month.year}
                                month={parseInt(month.month.split('/')[0]) || 0}
                            />
                        ) : (
                            <div className="p-4 space-y-3">
                                {loading && <p className="text-sm text-muted-foreground">{t('dashboard.details.loading')}</p>}

                                {!loading && (!details.ticketTypes || details.ticketTypes.length === 0) && (!details.regularizations || details.regularizations.length === 0) && (
                                    <p className="text-sm text-muted-foreground">{t('dashboard.details.noData')}</p>
                                )}

                                {!loading && details.ticketTypes && details.ticketTypes.length > 0 && (
                                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`select-all-${idx}`}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    checked={selectedTickets.size > 0 && Array.from(selectedTickets).length === details.ticketTypes.reduce((acc: number, val: any) => acc + val.ticketCount, 0)}
                                                />
                                                <label htmlFor={`select-all-${idx}`} className="text-sm font-medium cursor-pointer">
                                                    {t('dashboard.details.selectAll')}
                                                </label>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {selectedTickets.size} {t('dashboard.details.tickets')} seleccionados
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                            onClick={downloadCSV}
                                            disabled={selectedTickets.size === 0}
                                        >
                                            <FileSpreadsheet className="h-4 w-4" />
                                            {t('dashboard.details.exportExcel')}
                                        </Button>
                                    </div>
                                )}

                                {!loading && details.ticketTypes && details.ticketTypes.length > 0 && (
                                    <div className="space-y-4">
                                        {details.ticketTypes.map((typeData: any) => (
                                            <div key={typeData.type} className="border rounded-lg bg-card overflow-hidden">
                                                <div
                                                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 bg-muted/10"
                                                    onClick={() => toggleType(typeData.type)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {expandedTypes.has(typeData.type) ?
                                                            <ChevronDown className="h-4 w-4" /> :
                                                            <ChevronRight className="h-4 w-4" />
                                                        }
                                                        <span className="font-semibold">{typeData.type}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({typeData.ticketCount} {t('dashboard.details.tickets')})
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">{formatRate(typeData.totalHours, 2)}h</span>
                                                </div>

                                                {expandedTypes.has(typeData.type) && (
                                                    <div className="border-t p-3 space-y-3 bg-muted/5">
                                                        {Object.entries(groupByTicket(typeData.worklogs)).map(([ticketKey, worklogs]: [string, any]) => {
                                                            const ticketTotal = worklogs.reduce((sum: number, w: any) => sum + w.timeSpentHours, 0);
                                                            const summary = worklogs[0].issueSummary;
                                                            const hasOtherMonths = worklogs[0].hasOtherMonths || false;
                                                            const portalUrl = typeData.portalUrl;
                                                            const isTicketExpanded = expandedTickets.has(ticketKey);
                                                            const isTicketSelected = selectedTickets.has(ticketKey);

                                                            return (
                                                                <div key={ticketKey} className="border rounded bg-card space-y-0 overflow-hidden shadow-sm">
                                                                    <div
                                                                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${isTicketExpanded ? 'border-b bg-muted/20' : ''}`}
                                                                        onClick={() => toggleTicket(ticketKey)}
                                                                    >
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                                checked={isTicketSelected}
                                                                                onChange={(e) => handleTicketSelect(ticketKey, e.target.checked)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    {(() => {
                                                                                        const clientJiraId = (worklogs[0] as any).clientJiraId;

                                                                                        // Determine URL based on user role
                                                                                        const url = isAdmin
                                                                                            ? `https://altim.atlassian.net/browse/${ticketKey}`
                                                                                            : portalUrl
                                                                                                ? `${portalUrl}/browse/${clientJiraId || ticketKey}`
                                                                                                : null;

                                                                                        // Determine display text
                                                                                        const displayText = clientJiraId
                                                                                            ? `${clientJiraId} (${ticketKey})`
                                                                                            : ticketKey;

                                                                                        if (url) {
                                                                                            return (
                                                                                                <a
                                                                                                    href={url}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="font-medium text-sm text-primary hover:underline"
                                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                                >
                                                                                                    {displayText}
                                                                                                </a>
                                                                                            );
                                                                                        }
                                                                                        return <span className="font-medium text-sm">{displayText}</span>;
                                                                                    })()}
                                                                                    {worklogs[0].label && (
                                                                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200">
                                                                                            {worklogs[0].label}
                                                                                        </span>
                                                                                    )}
                                                                                    {hasOtherMonths && (
                                                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                                                            {t('dashboard.details.otherMonths')}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-xs text-muted-foreground truncate max-w-[500px]">{summary}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="font-semibold text-sm">{formatRate(ticketTotal, 2)}h</span>
                                                                            {isTicketExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" /> : <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />}
                                                                        </div>
                                                                    </div>

                                                                    {isTicketExpanded && (
                                                                        <div className="p-3 bg-card animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            {permissions.request_review && worklogs.some((w: any) => selectedWorklogs.some(sw => sw.id === w.id)) && (
                                                                                <div className="flex justify-start mb-2">
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
                                                                                        {t('dashboard.details.requestReview')}
                                                                                    </Button>
                                                                                </div>
                                                                            )}

                                                                            <table className="w-full text-xs border-collapse">
                                                                                <thead className="bg-muted/50">
                                                                                    <tr className="border-b">
                                                                                        {permissions.request_review && <th className="p-2 w-8"></th>}
                                                                                        <th className="p-2 text-left">{t('dashboard.details.date')}</th>
                                                                                        {!worklogs[0]?.tipoImputacion?.includes('Evolutivo') && <th className="p-2 text-left">{t('dashboard.details.author')}</th>}
                                                                                        <th className="p-2 text-left">{t('dashboard.details.imputationType')}</th>
                                                                                        {permissions.is_admin && <th className="p-2 text-left">{t('dashboard.details.origin')}</th>}
                                                                                        <th className="p-2 text-right">{t('dashboard.details.hours')}</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {worklogs.map((w: any, i: number) => {
                                                                                        const isSelected = selectedWorklogs.some(sw => sw.id === w.id);
                                                                                        const isEvolutivo = w.tipoImputacion?.includes('Evolutivo');
                                                                                        const isClaimed = w.isClaimed || false;
                                                                                        const isRefunded = w.isRefunded || false;
                                                                                        return (
                                                                                            <tr key={i} className={`border-b last:border-0 ${isSelected ? 'bg-primary/5' : ''} ${isClaimed ? 'bg-orange-50/50' : ''} ${isRefunded ? 'bg-red-50/30' : ''}`}>
                                                                                                {permissions.request_review && (
                                                                                                    <td className="p-2 text-center text-xs">
                                                                                                        <input
                                                                                                            type="checkbox"
                                                                                                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                                                                                            checked={isSelected}
                                                                                                            onChange={(e) => onWorklogSelect(w, e.target.checked)}
                                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                                            disabled={isClaimed}
                                                                                                        />
                                                                                                    </td>
                                                                                                )}
                                                                                                <td className="p-2 text-xs">
                                                                                                    <div className="flex items-center gap-1.5 ">
                                                                                                        {formatDate(w.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                                                                        {isClaimed && (
                                                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                                                                                {t('dashboard.details.inClaim')}
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {isRefunded && (
                                                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                                                                                {t('dashboard.details.returned')}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                                {!isEvolutivo && <td className="p-2 text-xs">{w.author}</td>}
                                                                                                <td className="p-2 text-xs">{w.tipoImputacion || '-'}</td>
                                                                                                {permissions.is_admin && <td className="p-2 text-[10px] text-muted-foreground">{w.originWpId || '-'}</td>}
                                                                                                <td className={`p-2 text-right font-medium text-xs ${isRefunded ? 'text-red-600' : ''}`}>{formatRate(w.timeSpentHours, 2)}h</td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!loading && details.regularizations && details.regularizations.length > 0 && (
                                    <div className="space-y-4 mt-8">
                                        <h4 className="font-semibold text-sm flex items-center gap-2">
                                            <span className="text-blue-700">{t('dashboard.details.regularizationsTitle')}</span>
                                        </h4>
                                        <div className="border rounded-lg bg-blue-50/20 border-blue-100 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-blue-100/30">
                                                    <tr className="border-b border-blue-100">
                                                        <th className="p-3 text-left font-semibold text-blue-900 w-24">{t('dashboard.details.date')}</th>
                                                        <th className="p-3 text-left font-semibold text-blue-900 w-40">{t('dashboard.details.type')}</th>
                                                        <th className="p-3 text-left font-semibold text-blue-900">{t('dashboard.details.description')}</th>
                                                        <th className="p-3 text-right font-semibold text-blue-900 w-24">{t('dashboard.details.quantity')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {details.regularizations.map((reg: any) => {
                                                        const isNegative = reg.type === 'MANUAL_CONSUMPTION';
                                                        return (
                                                            <tr key={reg.id} className="border-b last:border-0 border-blue-100 hover:bg-blue-100/10">
                                                                <td className="p-3 whitespace-nowrap text-xs">{formatDate(reg.date, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                                                <td className="p-3 font-medium text-[10px] uppercase tracking-wider text-blue-800">
                                                                    {reg.type === 'RETURN' ? t('dashboard.details.returned') :
                                                                        reg.type === 'EXCESS' ? t('dashboard.regularization') :
                                                                            reg.type.replace(/_/g, ' ')}
                                                                </td>
                                                                <td className="p-3 text-xs text-muted-foreground">{reg.description}</td>
                                                                <td className={`p-3 text-right font-bold text-xs ${isNegative || reg.type === 'RETURN' ? 'text-red-600' : 'text-green-700'}`}>
                                                                    {isNegative ? '-' : '+'}{formatRate(reg.quantity, 1)}h
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
