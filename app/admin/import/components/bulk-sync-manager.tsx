"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { getBulkSyncStatus, setBulkSyncStatus, stopBulkSync, SyncJobStatus } from "@/app/actions/sync-jobs";
import { startBulkManualSync, processNextSyncBatch } from "@/app/actions/cron";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, Zap, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncManager() {
    const { t } = useTranslations();
    const [status, setStatus] = useState<SyncJobStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [syncDays, setSyncDays] = useState<string>("30");

    const fetchStatus = useCallback(async () => {
        try {
            const currentStatus = await getBulkSyncStatus();
            setStatus(currentStatus);
        } catch (error) {
            console.error("Failed to fetch sync status:", error);
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

    const runBulkSync = async () => {
        const days = syncDays === "all" ? undefined : parseInt(syncDays);
        const confirmMsg = days
            ? `¿Deseas iniciar la sincronización rápida de los últimos ${days} días?`
            : t('import.sync.confirm');

        if (!confirm(confirmMsg)) {
            return;
        }

        toast.info("Iniciando sincronización...");

        // Defer heavy work to unblock UI immediately
        setTimeout(async () => {
            try {
                const res = await startBulkManualSync(days);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success("Sincronización iniciada");
                    fetchStatus();
                    // Start the iterative processing loop
                    processLoop();
                }
            } catch (err: any) {
                toast.error(t('import.sync.toast.error'));
            }
        }, 0);
    };

    const processLoop = async () => {
        try {
            const result = await processNextSyncBatch();
            if (result.error) {
                toast.error(`Error: ${result.error}`);
                fetchStatus();
                return;
            }
            if (result.finished) {
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
        await setBulkSyncStatus(null);
        setStatus(null);
    };

    const handleCancel = async () => {
        if (!confirm("¿Estás seguro de que deseas cancelar la sincronización actual? El proceso se detendrá al finalizar el Work Package que se está procesando en este momento.")) {
            return;
        }
        await stopBulkSync();
        toast.info("Solicitud de cancelación enviada");
        fetchStatus();
    };

    if (isLoadingStatus && !status) {
        return (
            <Card className="border-blue-200 bg-blue-50/10 shadow-sm border-2">
                <CardContent className="h-40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    const isSyncing = status?.isSyncing || false;
    const progress = status?.progress || 0;

    return (
        <Card className="border-blue-200 bg-blue-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    {t('import.sync.title')}
                </CardTitle>
                <CardDescription>
                    {t('import.sync.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isSyncing && progress < 100 && (
                    <div className="flex flex-col gap-4 p-4 bg-white/50 rounded-lg border border-blue-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-blue-900">Modo de Sincronización</p>
                                <Select value={syncDays} onValueChange={setSyncDays}>
                                    <SelectTrigger className="w-[200px] bg-white">
                                        <SelectValue placeholder="Seleccionar modo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Hoy (1 día)</SelectItem>
                                        <SelectItem value="7">Última semana (7 días)</SelectItem>
                                        <SelectItem value="30">Último mes (30 días)</SelectItem>
                                        <SelectItem value="90">Último trimestre (90 días)</SelectItem>
                                        <SelectItem value="180">Semestre (180 días)</SelectItem>
                                        <SelectItem value="365">Año completo (365 días)</SelectItem>
                                        <SelectItem value="all">Total (Todo el histórico)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={runBulkSync}
                                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-8"
                            >
                                <Zap className="mr-2 h-4 w-4 fill-white" />
                                {syncDays === "all" ? t('import.sync.button') : "Sincronización Rápida"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('import.sync.warning')}
                        </p>
                    </div>
                )}

                {(isSyncing || progress > 0) && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end text-sm">
                            <div className="space-y-1">
                                <p className="font-medium text-blue-900">
                                    {isSyncing ? `${t('import.sync.inProgress')} (${status?.currentWpName || '...'})` : t('import.sync.finished')}
                                </p>
                                <p className="text-xs text-blue-700">
                                    {t('import.sync.processing', { current: status?.currentIdx || 0, total: status?.totalWps || 0 })}
                                    {status?.syncDays && ` • Modo Diferencial (${status.syncDays}d)`}
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                {isSyncing && status?.startTime && status.currentIdx > 0 && (
                                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium justify-end">
                                        <Clock className="h-3 w-3" />
                                        {t('import.sync.eta', {
                                            time: formatTime(((Date.now() - status.startTime) / 1000 / status.currentIdx) * (status.totalWps - status.currentIdx))
                                        })}
                                    </p>
                                )}
                                <p className="font-bold text-lg">{Math.round(progress)}%</p>
                            </div>
                        </div>

                        <Progress value={progress} className="h-3 overflow-hidden" />

                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.success')}</p>
                                <p className="text-lg font-bold text-green-600">{status?.results.success || 0}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.errors')}</p>
                                <p className="text-lg font-bold text-red-600">{status?.results.errors || 0}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.total')}</p>
                                <p className="text-lg font-bold text-blue-600">{status?.totalWps || 0}</p>
                            </div>
                        </div>

                        {!isSyncing && progress >= 100 && (
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-sm text-green-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {t('import.sync.finished')}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearStatus}
                                >
                                    {t('import.sync.close')}
                                </Button>
                            </div>
                        )}

                        {isSyncing && (
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex justify-center p-3 bg-blue-50 rounded-md border border-blue-100 italic text-xs text-blue-600 text-center">
                                    Sincronización en curso en segundo plano. <br />
                                    Puedes cerrar esta pantalla y el proceso continuará.
                                </div>
                                <div className="flex gap-2">
                                    <Button disabled className="flex-1 bg-slate-100 text-slate-400">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('import.sync.inProgress')}
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
