"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getEligibleWorkPackagesForSync } from "@/app/actions/cron";
import { syncWorkPackage } from "@/app/actions/sync";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export function BulkSyncManager() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [totalWps, setTotalWps] = useState(0);
    const [currentWpName, setCurrentWpName] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const [results, setResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const runBulkSync = async () => {
        if (!confirm("¿Deseas iniciar la sincronización de todos los Work Packages? Este proceso puede tardar varios minutos.")) {
            return;
        }

        setIsSyncing(true);
        setProgress(0);
        setCurrentIdx(0);
        setResults({ success: 0, errors: 0 });
        const start = Date.now();
        setStartTime(start);

        try {
            const wps = await getEligibleWorkPackagesForSync();
            setTotalWps(wps.length);

            if (wps.length === 0) {
                toast.info("No hay Work Packages elegibles para sincronizar.");
                setIsSyncing(false);
                return;
            }

            for (let i = 0; i < wps.length; i++) {
                const wp = wps[i];
                setCurrentIdx(i + 1);
                setCurrentWpName(wp.name);

                // Update ETA
                if (i > 0) {
                    const elapsed = (Date.now() - start) / 1000;
                    const avgPerWp = elapsed / i;
                    const remaining = (wps.length - i) * avgPerWp;
                    setEta(formatTime(remaining));
                }

                try {
                    const res = await syncWorkPackage(wp.id);
                    if (res.error) {
                        setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                    } else {
                        setResults(prev => ({ ...prev, success: prev.success + 1 }));
                    }
                } catch (err) {
                    setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                }

                setProgress(((i + 1) / wps.length) * 100);
            }

            toast.success("Sincronización masiva finalizada");
        } catch (error) {
            toast.error("Error durante la sincronización masiva");
            console.error(error);
        } finally {
            setIsSyncing(false);
            setEta(null);
        }
    };

    return (
        <Card className="border-blue-200 bg-blue-50/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronización Manual Masiva
                </CardTitle>
                <CardDescription>
                    Actualiza todos los Work Packages (Bolsa, BD y Eventos) con los últimos datos de JIRA y Tempo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isSyncing && progress === 0 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground max-w-md">
                            Este proceso sustituye a la sincronización nocturna. Se recomienda ejecutarlo al inicio de la jornada o tras cambios masivos en JIRA.
                        </p>
                        <Button
                            onClick={runBulkSync}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Ejecutar Sincronización Total
                        </Button>
                    </div>
                )}

                {(isSyncing || progress > 0) && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end text-sm">
                            <div className="space-y-1">
                                <p className="font-medium text-blue-900">
                                    {isSyncing ? `Sincronizando: ${currentWpName}` : "Sincronización Finalizada"}
                                </p>
                                <p className="text-xs text-blue-700">
                                    Procesando {currentIdx} de {totalWps} paquetes
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                {eta && isSyncing && (
                                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                        <Clock className="h-3 w-3" />
                                        Tiempo restante est.: {eta}
                                    </p>
                                )}
                                <p className="font-bold text-lg">{Math.round(progress)}%</p>
                            </div>
                        </div>

                        <Progress value={progress} className="h-3 overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </Progress>

                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Éxitos</p>
                                <p className="text-lg font-bold text-green-600">{results.success}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Errores</p>
                                <p className="text-lg font-bold text-red-600">{results.errors}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Total</p>
                                <p className="text-lg font-bold text-blue-600">{totalWps}</p>
                            </div>
                        </div>

                        {!isSyncing && progress === 100 && (
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setProgress(0); setResults({ success: 0, errors: 0 }); }}
                                >
                                    Cerrar y Limpiar
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
