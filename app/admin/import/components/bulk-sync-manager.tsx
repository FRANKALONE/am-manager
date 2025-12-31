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
        console.log("[DEBUG] runBulkSync initiated");
        if (!confirm("¿Deseas iniciar la sincronización de todos los Work Packages? Este proceso puede tardar varios minutos.")) {
            console.log("[DEBUG] runBulkSync cancelled by user");
            return;
        }

        setIsSyncing(true);
        setProgress(0);
        setCurrentIdx(0);
        setResults({ success: 0, errors: 0 });
        const start = Date.now();
        setStartTime(start);

        try {
            console.log("[DEBUG] Fetching eligible Work Packages...");
            const wps = await getEligibleWorkPackagesForSync();
            console.log(`[DEBUG] Found ${wps?.length || 0} Work Packages:`, wps);

            if (!wps || !Array.isArray(wps)) {
                console.error("[DEBUG] Invalid WPs data structure received:", wps);
                toast.error("Error al obtener la lista de Work Packages");
                setIsSyncing(false);
                return;
            }

            setTotalWps(wps.length);

            if (wps.length === 0) {
                console.log("[DEBUG] No WPs to sync");
                toast.info("No hay Work Packages elegibles para sincronizar.");
                setIsSyncing(false);
                return;
            }

            for (let i = 0; i < wps.length; i++) {
                const wp = wps[i];
                console.log(`[DEBUG] (${i + 1}/${wps.length}) Starting sync for WP: ${wp.id} - ${wp.name}`);
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
                    console.log(`[DEBUG] Calling syncWorkPackage server action for ${wp.id}`);
                    const res = await syncWorkPackage(wp.id);
                    console.log(`[DEBUG] Sync result for ${wp.id}:`, JSON.stringify(res).substring(0, 500));

                    if (res?.error) {
                        console.error(`[DEBUG] WP Sync Error (${wp.id}):`, res.error);
                        setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                    } else {
                        console.log(`[DEBUG] WP Sync Success (${wp.id})`);
                        setResults(prev => ({ ...prev, success: prev.success + 1 }));
                    }
                } catch (err: any) {
                    console.error(`[DEBUG] CRITICAL Exception syncing WP ${wp.id}:`, err);
                    setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                    toast.error(`Error crítico en sync de ${wp.name}`);
                }

                const newProgress = ((i + 1) / wps.length) * 100;
                console.log(`[DEBUG] Progress update: ${newProgress.toFixed(2)}%`);
                setProgress(newProgress);
            }

            console.log("[DEBUG] Bulk sync completed normally");
            toast.success("Sincronización masiva finalizada");
        } catch (error: any) {
            console.error("[DEBUG] FATAL Error during bulk sync process:", error);
            toast.error("Error durante la sincronización masiva");
        } finally {
            console.log("[DEBUG] runBulkSync finalization");
            setIsSyncing(false);
            setEta(null);
        }
    };

    return (
        <Card className="border-blue-200 bg-blue-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronización Manual Masiva [DEBUG MODE]
                </CardTitle>
                <CardDescription>
                    Actualiza todos los Work Packages (Bolsa, BD y Eventos) con los últimos datos de JIRA y Tempo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isSyncing && progress === 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-blue-100">
                        <p className="text-sm text-muted-foreground max-w-md">
                            Este proceso sustituye a la sincronización nocturna. Se recomienda ejecutarlo al inicio de la jornada o tras cambios masivos en JIRA.
                        </p>
                        <Button
                            onClick={runBulkSync}
                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-8"
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
                                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium justify-end">
                                        <Clock className="h-3 w-3" />
                                        Tiempo restante est.: {eta}
                                    </p>
                                )}
                                <p className="font-bold text-lg">{Math.round(progress)}%</p>
                            </div>
                        </div>

                        <Progress value={progress} className="h-3 overflow-hidden" />

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
                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setProgress(0); setResults({ success: 0, errors: 0 }); }}
                                >
                                    Cerrar y Limpiar
                                </Button>
                            </div>
                        )}

                        {isSyncing && (
                            <div className="flex justify-center pt-2">
                                <Button disabled className="w-full bg-slate-100 text-slate-400">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sincronización en curso...
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
