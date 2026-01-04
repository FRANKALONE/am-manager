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
                            {data.tickets.map((ticket: any) => (
                                <TableRow key={ticket.issueKey}>
                                    <TableCell>
                                        <span className="text-xs px-2 py-1 rounded bg-secondary">
                                            {ticket.issueType}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {ticket.issueKey}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate" title={ticket.issueSummary}>
                                        {ticket.issueSummary}
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
        </div>
    );
}
