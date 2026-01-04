"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getEligibleWorkPackagesForSync } from "@/app/actions/cron";
import { syncWorkPackage } from "@/app/actions/sync";
import { createImportLog } from "@/app/actions/import-logs";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncManager() {
    const { t } = useTranslations();
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
        if (!confirm(t('import.sync.confirm'))) {
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

            if (!wps || !Array.isArray(wps)) {
                toast.error(t('import.sync.toast.error'));
                setIsSyncing(false);
                return;
            }

            setTotalWps(wps.length);

            if (wps.length === 0) {
                toast.info(t('import.sync.toast.empty'));
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

                    if (res?.error) {
                        setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                    } else {
                        setResults(prev => ({ ...prev, success: prev.success + 1 }));
                    }
                } catch (err: any) {
                    setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
                    toast.error(t('import.sync.toast.critical', { name: wp.name }));
                }

                const newProgress = ((i + 1) / wps.length) * 100;
                setProgress(newProgress);
            }

            // Guardar en el historial
            await createImportLog({
                type: 'MANUAL_SYNC',
                status: results.errors === 0 ? 'SUCCESS' : (results.success > 0 ? 'PARTIAL' : 'ERROR'),
                filename: `manual_bulk_sync_${new Date().toISOString().split('T')[0]}`,
                totalRows: wps.length,
                processedCount: results.success,
                errors: JSON.stringify({
                    totalProcessed: wps.length,
                    success: results.success,
                    errors: results.errors,
                    executionTime: Date.now() - start
                })
            });

            toast.success(t('import.sync.toast.success'));
        } finally {
            setIsSyncing(false);
            setEta(null);
        }
    };

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
                {!isSyncing && progress === 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-blue-100">
                        <p className="text-sm text-muted-foreground max-w-md">
                            {t('import.sync.warning')}
                        </p>
                        <Button
                            onClick={runBulkSync}
                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-8"
                        >
                            {t('import.sync.button')}
                        </Button>
                    </div>
                )}

                {(isSyncing || progress > 0) && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end text-sm">
                            <div className="space-y-1">
                                <p className="font-medium text-blue-900">
                                    {isSyncing ? `${t('import.sync.inProgress')} (${currentWpName})` : t('import.sync.finished')}
                                </p>
                                <p className="text-xs text-blue-700">
                                    {t('import.sync.processing', { current: currentIdx, total: totalWps })}
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                {eta && isSyncing && (
                                    <p className="flex items-center gap-1 text-xs text-amber-600 font-medium justify-end">
                                        <Clock className="h-3 w-3" />
                                        {t('import.sync.eta', { time: eta })}
                                    </p>
                                )}
                                <p className="font-bold text-lg">{Math.round(progress)}%</p>
                            </div>
                        </div>

                        <Progress value={progress} className="h-3 overflow-hidden" />

                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.success')}</p>
                                <p className="text-lg font-bold text-green-600">{results.success}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.errors')}</p>
                                <p className="text-lg font-bold text-red-600">{results.errors}</p>
                            </div>
                            <div className="bg-white/50 p-2 rounded border border-blue-100 text-center">
                                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">{t('import.sync.total')}</p>
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
                                    {t('import.sync.close')}
                                </Button>
                            </div>
                        )}

                        {isSyncing && (
                            <div className="flex justify-center pt-2">
                                <Button disabled className="w-full bg-slate-100 text-slate-400">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('import.sync.inProgress')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
