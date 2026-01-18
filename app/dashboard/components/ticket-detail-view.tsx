"use client";

import { useState, useEffect } from "react";
import { getMonthlyTicketDetails } from "@/app/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";

interface TicketDetailViewProps {
    wpId: string;
    year: number;
    month: number;
}

export function TicketDetailView({ wpId, year, month }: TicketDetailViewProps) {
    const { t, locale } = useTranslations();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const result = await getMonthlyTicketDetails(wpId, year, month);
            setData(result);
            setLoading(false);
        }
        fetchData();
    }, [wpId, year, month]);

    const formatRate = (num: number, digits: number = 2) => {
        return num.toLocaleString(locale || 'es', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    };

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">{t('dashboard.ticketsDetail.loading')}</div>;
    }

    if (!data || data.totalTickets === 0) {
        return <div className="p-4 text-center text-muted-foreground">{t('dashboard.ticketsDetail.noData')}</div>;
    }

    return (
        <div className="space-y-4 p-4">
            {/* Summary by Type */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">{t('dashboard.ticketsDetail.summaryTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(data.byType).map(([type, count]) => (
                            <div key={type} className="text-center">
                                <div className="text-2xl font-bold text-primary">{count as number}</div>
                                <div className="text-xs text-muted-foreground">{type}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">
                        {t('dashboard.ticketsDetail.listTitle', { count: data.totalTickets })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('dashboard.ticketsDetail.type')}</TableHead>
                                <TableHead>{t('dashboard.ticketsDetail.issueId')}</TableHead>
                                <TableHead>{t('dashboard.ticketsDetail.summary')}</TableHead>
                                <TableHead>{t('dashboard.ticketsDetail.created')}</TableHead>
                                <TableHead>{t('dashboard.ticketsDetail.reporter')}</TableHead>
                                <TableHead>{t('dashboard.ticketsDetail.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.tickets.map((ticket: any, idx: number) => (
                                <TableRow key={`${ticket.issueKey}-${idx}`}>
                                    <TableCell>
                                        <span className="text-xs px-2 py-1 rounded bg-secondary">
                                            {ticket.issueType}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        <div className="flex items-center gap-2">
                                            {ticket.issueKey}
                                            {ticket.hasReturn && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-bold">
                                                    DEVUELTO
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate" title={ticket.issueSummary}>
                                        <div className="flex flex-col">
                                            <span>{ticket.issueSummary}</span>
                                            {ticket.isManual && (
                                                <span className="text-xs font-bold text-orange-600">
                                                    ({ticket.quantity} {ticket.quantity === 1 ? 'evento' : 'eventos'})
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(ticket.createdDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </TableCell>
                                    <TableCell className="text-sm">{ticket.reporter}</TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2 py-1 rounded bg-muted">
                                            {ticket.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Regularizations Section */}
            {data.regularizations && data.regularizations.length > 0 && (
                <div className="space-y-4 mt-8">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="text-blue-700">{t('dashboard.details.regularizationsTitle')}</span>
                    </h4>
                    <div className="border rounded-lg bg-blue-50/20 border-blue-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-100/30">
                                <tr className="border-b border-blue-100">
                                    <th className="p-3 text-left font-semibold text-blue-900 w-24">{t('dashboard.details.date')}</th>
                                    <th className="p-3 text-left font-semibold text-blue-900 w-32">Ticket ID</th>
                                    <th className="p-3 text-left font-semibold text-blue-900 w-40">{t('dashboard.details.type')}</th>
                                    <th className="p-3 text-left font-semibold text-blue-900">{t('dashboard.details.description')}</th>
                                    <th className="p-3 text-right font-semibold text-blue-900 w-24">{t('dashboard.details.quantity')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.regularizations.map((reg: any) => (
                                    <tr key={reg.id} className="border-b last:border-0 border-blue-100 hover:bg-blue-100/10">
                                        <td className="p-3 whitespace-nowrap text-xs">{formatDate(reg.date, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                        <td className="p-3 font-mono text-xs">{reg.ticketId || '-'}</td>
                                        <td className="p-3 font-medium text-[10px] uppercase tracking-wider text-blue-800">
                                            {reg.type === 'RETURN' ? t('dashboard.details.returned') : reg.type.replace(/_/g, ' ')}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">{reg.description}</td>
                                        <td className="p-3 text-right font-bold text-xs text-red-600">
                                            -{formatRate(reg.quantity, 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
