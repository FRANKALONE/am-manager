"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { syncWorkPackage } from "@/app/actions/sync";
import { getWorkPackages } from "@/app/actions/work-packages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Terminal, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SyncDebugPage() {
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
        <div className="container mx-auto py-8 space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Terminal className="h-8 w-8 text-blue-500" />
                Diagnóstico de Sincronización
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Prueba</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Seleccionar Work Package</label>
                        <Select onValueChange={setSelectedWp} value={selectedWp}>
                            <SelectTrigger>
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
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ejecutar Diagnóstico"}
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card className={result.error ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
                    <CardContent className="py-4 flex items-center gap-2">
                        {result.error ? (
                            <>
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span className="font-semibold text-red-700">Error: {result.error}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="font-semibold text-green-700">
                                    Éxito: {result.processed} worklogs procesados, {result.totalHours?.toFixed(2)}h totales.
                                </span>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="border-b border-slate-800">
                    <CardTitle className="text-slate-200 flex items-center gap-2 text-sm font-mono">
                        <Terminal className="h-4 w-4" />
                        SALIDA DE LOGS (LIVE)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px] w-full p-4">
                        <div className="font-mono text-sm space-y-1">
                            {logs.length === 0 && !loading && (
                                <p className="text-slate-500 italic">No hay logs para mostrar. Selecciona un WP y pulsa "Ejecutar".</p>
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
                                    <div key={i} className={`${color} whitespace-pre-wrap`}>
                                        {log}
                                    </div>
                                );
                            })}
                            {loading && (
                                <div className="text-blue-400 animate-pulse flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Sincronizando y recolectando logs...
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
