"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getHistorySyncStatus, setHistorySyncStatus, stopHistorySync, HistorySyncJobStatus } from "@/app/actions/history-sync-jobs";
import { startHistorySync, processNextHistoryBatch } from "@/app/actions/history-sync-cron";
import { Loader2, History, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncHistoryManager() {
    const { t } = useTranslations();
    const [status, setStatus] = useState<HistorySyncJobStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const currentStatus = await getHistorySyncStatus();
            setStatus(currentStatus);
        } catch (error) {
            console.error("Failed to fetch history sync status:", error);
        } finally {
            setIsLoadingStatus(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Polling effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status?.isSyncing) {
            interval = setInterval(fetchStatus, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status?.isSyncing, fetchStatus]);

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const runHistorySync = async () => {
        if (!confirm("¿Deseas iniciar la sincronización completa del historial de estados? Este proceso puede tardar 20-30 minutos.")) {
            return;
        }

        toast.info("Iniciando sincronización de históricos...");

        setTimeout(async () => {
            try {
                const res = await startHistorySync();
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(`Sincronización iniciada: ${res.totalRecords} registros`);
                    fetchStatus();
                    processLoop();
                }
            } catch (err: any) {
                toast.error("Error al iniciar sincronización");
            }
        }, 0);
    };

    const processLoop = async () => {
        try {
            const result = await processNextHistoryBatch();
            if (result.error) {
                toast.error(`Error: ${result.error}`);
                fetchStatus();
                return;
            }
            if (result.finished) {
                toast.success("🎉 Sincronización de históricos completada!");
                fetchStatus();
                return;
            }
            // Continue processing
            fetchStatus();
            setTimeout(processLoop, 100);
        } catch (err: any) {
            toast.error("Error procesando sincronización");
            fetchStatus();
        }
    };

    const clearStatus = async () => {
        await setHistorySyncStatus(null);
        setStatus(null);
    };

    const handleCancel = async () => {
        if (!confirm("¿Estás seguro de que deseas cancelar la sincronización actual?")) {
            return;
        }
        await stopHistorySync();
        toast.info("Solicitud de cancelación enviada");
        fetchStatus();
    };

    if (isLoadingStatus && !status) {
        return (
            <Card className="border-orange-200 bg-orange-50/10 shadow-sm border-2">
                <CardContent className="h-40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    const isSyncing = status?.isSyncing || false;
    const progress = status?.progress || 0;

    return (
        <Card className="border-orange-200 bg-orange-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className={`h-5 w-5 text-orange-500 ${isSyncing ? 'animate-pulse' : ''}`} />
                    Sincronización de Historial de Estados
                </CardTitle>
                <CardDescription>
                    Recupera de Jira el historial completo de cambios de estado para todos los tickets y propuestas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isSyncing && progress < 100 && (
                    <div className="flex flex-col gap-4 p-4 bg-white/50 rounded-lg border border-orange-100">
                        <p className="text-xs text-muted-foreground">
                            Este proceso es necesario para rellenar los datos del Cuadro de Mando de AM. Solo se consultan metadatos de transición (fechas de entrega, aprobaciones, etc.), sin afectar consumos ni horas.
                        </p>
                        <Button
                            onClick={runHistorySync}
                            className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto px-8"
                        >
                            <History className="mr-2 h-4 w-4" />
                            Sincronizar Históricos
                        </Button>
                    </div>
                )}

                {(isSyncing || progress > 0) && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end text-sm">
                            <div className="space-y-1">
                                <p className="font-medium text-orange-900">
                                    {isSyncing ? `Sincronizando... (${status?.currentKey || '...'})` : 'Sincronización finalizada'}
                                </p>
                                <p className="text-xs text-orange-700">
                                    Procesando {status?.currentIdx || 0} de {status?.totalRecords || 0} registros
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                {isSyncing && status?.startTime && status.currentIdx > 0 && (
                                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium justify-end">
                                        <Clock className="h-3 w-3" />
                                        ETA: {formatTime(((Date.now() - status.startTime) / 1000 / status.currentIdx) * (status.totalRecords - status.currentIdx))}
                                    </p>
                                )}
                                <p className="font-bold text-lg">{Math.round(progress)}%</p>
                            </div>
                        </div>

                        <Progress value={progress} className="h-3 overflow-hidden" />

                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="bg-white/50 p-2 rounded border border-orange-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Exitosos</p>
                                <p className="text-lg font-bold text-green-600">{status?.results.success || 0}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-orange-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Errores</p>
                                <p className="text-lg font-bold text-red-600">{status?.results.errors || 0}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-orange-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Total</p>
                                <p className="text-lg font-bold text-orange-600">{status?.totalRecords || 0}</p>
                            </div>
                        </div>

                        {!isSyncing && progress >= 100 && (
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-sm text-green-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Sincronización completada
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearStatus}
                                >
                                    Cerrar
                                </Button>
                            </div>
                        )}

                        {isSyncing && (
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex justify-center p-3 bg-orange-50 rounded-md border border-orange-100 italic text-xs text-orange-600 text-center">
                                    Sincronización en curso en segundo plano. <br />
                                    Puedes cerrar esta pantalla y el proceso continuará.
                                </div>
                                <div className="flex gap-2">
                                    <Button disabled className="flex-1 bg-slate-100 text-slate-400">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sincronizando...
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={handleCancel}
                                        title="Cancelar Sincronización"
                                    >
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!isSyncing && status?.stopped && (
                            <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Sincronización detenida por el usuario o por el sistema.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { backfillHistoryData } from "@/app/actions/sync";
import { Loader2, History, CheckCircle2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncHistoryManager() {
    const { t } = useTranslations();
    const [isSyncing, setIsSyncing] = useState(false);
    const [success, setSuccess] = useState<string[] | null>(null);
    const [showLogs, setShowLogs] = useState(false);

    const runBackfill = async () => {
        if (!confirm(t('import.historySync.confirm'))) {
            return;
        }

        setIsSyncing(true);
        setSuccess(null);
        setShowLogs(false);

        try {
            const res = await backfillHistoryData();
            if (res.success) {
                if (res.completed) {
                    toast.success(`🎉 Sincronización completada!`);
                } else if (res.hasMore) {
                    toast.success(`✅ Lote procesado. ${res.estimatedRuns} ejecuciones restantes`);
                } else {
                    toast.success(`✅ Sincronización completada`);
                }
                setSuccess(res.logs || ["Finalizado correctamente"]);
            } else {
                toast.error(res.error || t('import.historySync.toast.error'));
            }
        } catch (err: any) {
            toast.error(t('import.historySync.toast.critical'));
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className={`h-5 w-5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    {t('import.historySync.title')}
                </CardTitle>
                <CardDescription>
                    {t('import.historySync.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-amber-500/10">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground max-w-md">
                            {t('import.historySync.warning')}
                        </p>
                        {success && (
                            <div className="flex flex-col gap-2 pt-2">
                                <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Última sincronización completada: {new Date().toLocaleTimeString()}
                                </p>
                                <p className="text-[10px] text-slate-500 italic">
                                    💡 Puedes salir de esta página. El resultado quedará registrado en "Historial de Importaciones" más abajo.
                                </p>
                                <div className="flex gap-3">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-amber-600 w-fit text-xs"
                                        onClick={() => setShowLogs(!showLogs)}
                                    >
                                        <ScrollText className="w-3 h-3 mr-1" />
                                        {showLogs ? "Ocultar detalles" : "Ver detalles del proceso"}
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-slate-500 w-fit text-xs italic"
                                        onClick={() => {
                                            const historySection = document.getElementById('import-history');
                                            if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        Ver en Historial de Importaciones
                                    </Button>
                                </div>
                            </div>
                        )}
                        {isSyncing && (
                            <p className="text-xs text-amber-600 font-medium flex items-center gap-1 pt-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Sincronización en curso... Puedes salir de esta página, el proceso continuará en segundo plano.
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={runBackfill}
                        disabled={isSyncing}
                        className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto px-8"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('import.historySync.syncing')}
                            </>
                        ) : (
                            t('import.historySync.button')
                        )}
                    </Button>
                </div>

                {showLogs && success && (
                    <div className="mt-4 p-4 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-mono max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {success.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
