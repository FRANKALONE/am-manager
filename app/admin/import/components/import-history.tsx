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
                                                    {log.type === 'BULK_DATA' ? 'Bulk Data' :
                                                        log.type === 'CRON_SYNC' ? 'Auto Sync' :
                                                            log.type === 'MANUAL_SYNC' ? 'Manual Sync' :
                                                                'Regularizaciones'}
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
                                                    <div className="space-y-4">
                                                        {log.type === 'CRON_SYNC' || log.type === 'MANUAL_SYNC' ? (
                                                            <div className="text-xs space-y-3">
                                                                <p className="font-semibold text-slate-700">Resumen de Sincronización Automática:</p>
                                                                {(() => {
                                                                    try {
                                                                        const summary = JSON.parse(log.errors);
                                                                        return (
                                                                            <div className="space-y-3">
                                                                                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border shadow-sm max-w-md">
                                                                                    <div><span className="text-muted-foreground">Procesados:</span> {summary.totalProcessed}</div>
                                                                                    <div><span className="text-muted-foreground">Éxitos:</span> <span className="text-green-600 font-bold">{summary.success}</span></div>
                                                                                    <div><span className="text-muted-foreground">Errores:</span> <span className="text-red-600 font-bold">{summary.errors}</span></div>
                                                                                    <div><span className="text-muted-foreground">Tiempo:</span> {(summary.executionTime / 1000).toFixed(1)}s</div>
                                                                                </div>

                                                                                {summary.details && summary.details.some((d: any) => d.status !== 'SUCCESS') && (
                                                                                    <div className="space-y-1">
                                                                                        <p className="font-bold text-red-700">Fallas específicas:</p>
                                                                                        <ul className="list-disc pl-4 text-red-600">
                                                                                            {summary.details.filter((d: any) => d.status !== 'SUCCESS').map((d: any, i: number) => (
                                                                                                <li key={i}><strong>{d.id} ({d.name}):</strong> {d.error}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}

                                                                                {summary.duplicates && summary.duplicates.length > 0 && (
                                                                                    <div className="space-y-2">
                                                                                        <p className="font-bold text-amber-700">Posibles Duplicados Detectados:</p>
                                                                                        <div className="space-y-4">
                                                                                            {summary.duplicates.map((d: any, i: number) => (
                                                                                                <div key={i} className="bg-amber-50/50 border border-amber-100 rounded-md p-2">
                                                                                                    <p className="text-[11px] font-bold text-amber-800 mb-1">{d.wpName}</p>
                                                                                                    <div className="overflow-x-auto">
                                                                                                        <table className="w-full text-[10px] text-left">
                                                                                                            <thead>
                                                                                                                <tr className="border-b border-amber-200">
                                                                                                                    <th className="pb-1">Ticket</th>
                                                                                                                    <th className="pb-1">Fecha</th>
                                                                                                                    <th className="pb-1 text-right">Manual</th>
                                                                                                                    <th className="pb-1 text-right">Sinc.</th>
                                                                                                                    <th className="pb-1 text-center">Coincide</th>
                                                                                                                </tr>
                                                                                                            </thead>
                                                                                                            <tbody>
                                                                                                                {d.duplicates.map((dupe: any, j: number) => (
                                                                                                                    <tr key={j} className="border-b border-amber-100 last:border-0">
                                                                                                                        <td className="py-1 font-medium">{dupe.ticketId}</td>
                                                                                                                        <td className="py-1">{new Date(dupe.date).toLocaleDateString()}</td>
                                                                                                                        <td className="py-1 text-right">{dupe.manualHours}h</td>
                                                                                                                        <td className="py-1 text-right">{dupe.syncedHours}h</td>
                                                                                                                        <td className="py-1 text-center">
                                                                                                                            {dupe.isExactMatch ? (
                                                                                                                                <Badge className="bg-green-100 text-green-700 text-[8px] px-1 h-3">SÍ</Badge>
                                                                                                                            ) : (
                                                                                                                                <Badge variant="outline" className="text-amber-600 text-[8px] px-1 h-3 border-amber-200">PARCIAL</Badge>
                                                                                                                            )}
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                ))}
                                                                                                            </tbody>
                                                                                                        </table>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    } catch (e) {
                                                                        return <p className="text-red-500">Error al parsear el resumen: {log.errors}</p>;
                                                                    }
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs font-semibold text-red-700">Errores registrados:</p>
                                                                <ul className="list-disc pl-4 space-y-1 text-xs text-red-600 max-h-40 overflow-y-auto">
                                                                    {(() => {
                                                                        try {
                                                                            const errs = JSON.parse(log.errors);
                                                                            return Array.isArray(errs) ? errs.map((err: string, i: number) => (
                                                                                <li key={i}>{err}</li>
                                                                            )) : <li>{log.errors}</li>;
                                                                        } catch (e) {
                                                                            return <li>{log.errors}</li>;
                                                                        }
                                                                    })()}
                                                                </ul>
                                                            </>
                                                        )}
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
