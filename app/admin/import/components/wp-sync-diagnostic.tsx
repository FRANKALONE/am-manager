"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { syncWorkPackage } from "@/app/actions/sync";
import { getWorkPackages } from "@/app/actions/work-packages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Terminal, AlertCircle, CheckCircle2, Search } from "lucide-react";

export function WpSyncDiagnostic() {
    const [wps, setWps] = useState<any[]>([]);
    const [selectedWp, setSelectedWp] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        getWorkPackages().then(setWps);
    }, []);

    const runDebugSync = async () => {
        if (!selectedWp) return;
        setLoading(true);
        setLogs([]);
        setResult(null);

        try {
            const res = await syncWorkPackage(selectedWp, true);
            if (res.logs) setLogs(res.logs);
            setResult(res);
        } catch (error: any) {
            setResult({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-amber-200 bg-amber-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-amber-500" />
                    Diagnóstico de Sincronización WP
                </CardTitle>
                <CardDescription>
                    Compara los datos de JIRA/Tempo con la base de datos para un Work Package concreto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-end gap-4 bg-white/50 p-4 rounded-lg border border-amber-100">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Seleccionar Work Package</label>
                        <Select onValueChange={setSelectedWp} value={selectedWp}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Busca un WP..." />
                            </SelectTrigger>
                            <SelectContent>
                                {wps.map((wp) => (
                                    <SelectItem key={wp.id} value={wp.id}>
                                        {wp.id} - {wp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={runDebugSync}
                        disabled={loading || !selectedWp}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ejecutar Diagnóstico"}
                    </Button>
                </div>

                {result && (
                    <div className={`p-4 rounded-lg border flex items-center gap-3 ${result.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
                        {result.error ? (
                            <>
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                <span className="font-semibold text-sm">Error: {result.error}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <span className="font-semibold text-sm">
                                    Éxito: {result.processed} worklogs procesados, {result.totalHours?.toFixed(2)}h totales.
                                </span>
                            </>
                        )}
                    </div>
                )}

                <div className="bg-slate-900 border-slate-700 rounded-lg overflow-hidden shadow-inner">
                    <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Salida de Logs</span>
                    </div>
                    <ScrollArea className="h-[300px] w-full p-4">
                        <div className="font-mono text-xs space-y-1">
                            {logs.length === 0 && !loading && (
                                <p className="text-slate-500 italic">No hay logs para mostrar. Selecciona un WP y pulsa "Ejecutar Diagnóstico".</p>
                            )}
                            {logs.map((log, i) => {
                                const isError = log.includes("[ERROR]");
                                const isWarn = log.includes("[WARN]");
                                const isInfo = log.includes("[INFO]");
                                const isFilter = log.includes("[FILTER]");

                                let color = "text-slate-300";
                                if (isError) color = "text-red-400";
                                else if (isWarn) color = "text-yellow-400";
                                else if (isInfo) color = "text-blue-400";
                                else if (isFilter) color = "text-slate-500";

                                return (
                                    <div key={i} className={`${color} whitespace-pre-wrap py-0.5 border-b border-white/5 last:border-0`}>
                                        {log}
                                    </div>
                                );
                            })}
                            {loading && (
                                <div className="text-blue-400 animate-pulse flex items-center gap-2 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sincronizando y recolectando logs...
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
