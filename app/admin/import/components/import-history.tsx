"use client";

import React, { useEffect, useState, Fragment } from "react";
import { getImportLogs, clearImportLogs } from "@/app/actions/import-logs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ImportHistory() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    async function loadLogs() {
        setIsLoading(true);
        const data = await getImportLogs();
        setLogs(data);
        setIsLoading(false);
    }

    useEffect(() => {
        loadLogs();
        // Set interval to refresh logs occasionally if user stays on page
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    async function handleClear() {
        if (!confirm("¿Estás seguro de que quieres borrar el historial de importaciones?")) return;
        await clearImportLogs();
        loadLogs();
    }

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Historial de Importaciones</CardTitle>
                    <CardDescription>
                        Registro de los últimos procesos de carga masiva.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadLogs}>Actualizar</Button>
                    <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpiar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No hay registros de importación todavía.
                    </div>
                ) : (
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[180px]">Fecha</TableHead>
                                    <TableHead>Archivo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Resultado</TableHead>
                                    <TableHead className="text-right">Progreso</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <Fragment key={log.id}>
                                        <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                                            <TableCell className="text-xs">
                                                {format(new Date(log.date), "dd MMM yyyy, HH:mm", { locale: es })}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate font-medium" title={log.filename}>
                                                {log.filename || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] uppercase">
                                                    {log.type === 'BULK_DATA' ? 'Bulk Data' : 'Regularizaciones'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                            log.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                                                                'bg-red-100 text-red-700 hover:bg-red-100'
                                                    }
                                                >
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs">
                                                {log.processedCount} / {log.totalRows}
                                            </TableCell>
                                            <TableCell>
                                                {expandedRow === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </TableCell>
                                        </TableRow>
                                        {expandedRow === log.id && log.errors && (
                                            <TableRow className="bg-slate-50/50">
                                                <TableCell colSpan={6} className="p-4 border-t border-slate-100">
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-red-700">Errores registrados:</p>
                                                        <ul className="list-disc pl-4 space-y-1 text-xs text-red-600 max-h-40 overflow-y-auto">
                                                            {JSON.parse(log.errors).map((err: string, i: number) => (
                                                                <li key={i}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
