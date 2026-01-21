"use client";

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
                toast.success(`✅ Sincronización completada en ${res.batches || 1} lotes`);
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
