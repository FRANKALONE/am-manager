"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, Info, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearEmailLogs } from "@/app/actions/email-admin";
import { toast } from "sonner";

export function EmailLogsTable({ logs, t }: { logs: any[], t: any }) {
    const [loading, setLoading] = useState(false);
    const handleClear = async () => {
        if (!confirm(t('common.confirm'))) return;
        setLoading(true);
        try {
            const result = await clearEmailLogs();
            if (result.success) {
                toast.success(t('common.success'));
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    if (logs.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border rounded-md">
                {t('common.noData')}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    disabled={loading || logs.length === 0}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('admin.emails.logs.clear')}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin.emails.logs.table.date')}</TableHead>
                            <TableHead>{t('admin.emails.logs.table.to')}</TableHead>
                            <TableHead>{t('admin.emails.logs.table.subject')}</TableHead>
                            <TableHead>{t('admin.emails.logs.table.status')}</TableHead>
                            <TableHead className="text-right">{t('admin.emails.logs.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs">
                                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                                </TableCell>
                                <TableCell className="font-medium max-w-[200px] truncate">
                                    {log.to}
                                </TableCell>
                                <TableCell className="max-w-[250px] truncate text-xs">
                                    {log.subject}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={
                                            log.status === 'SUCCESS' ? 'bg-green-50 text-green-700 border-green-200' :
                                                log.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                        }
                                    >
                                        {log.status === 'SUCCESS' ? t('admin.emails.logs.status.success') :
                                            log.status === 'FAILED' ? t('admin.emails.logs.status.failed') :
                                                t('admin.emails.logs.status.simulated')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {log.error && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="w-4 h-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    <p className="text-xs break-words">{log.error}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

