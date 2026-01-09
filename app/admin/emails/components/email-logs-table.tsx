"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function EmailLogsTable({ logs }: { logs: any[] }) {
    if (logs.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border rounded-md">
                No hay logs de envío registrados.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Destinatario</TableHead>
                        <TableHead>Asunto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Info</TableHead>
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
                                <StatusBadge status={log.status} />
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
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'SUCCESS':
            return (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Enviado
                </Badge>
            );
        case 'FAILED':
            return (
                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                    <XCircle className="w-3 h-3 mr-1" /> Error
                </Badge>
            );
        case 'SIMULATED':
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                    <Clock className="w-3 h-3 mr-1" /> Simulado
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}
