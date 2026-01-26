"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function AMASyncWorkloadManager() {
    const { t } = useTranslations();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastResult, setLastResult] = useState<{ success: boolean; message: string; workload?: any } | null>(null);

    const runSync = async () => {
        setIsSyncing(true);
        setLastResult(null);

        try {
            const response = await fetch("/api/ama-evolutivos/sync-daily", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok) {
                setLastResult({
                    success: true,
                    message: data.message,
                    workload: data.workload
                });
                toast.success("Métricas actualizadas correctamente");
            } else {
                setLastResult({
                    success: false,
                    message: data.error || "Error al sincronizar"
                });
                toast.error("Error en la sincronización");
            }
        } catch (error: any) {
            setLastResult({
                success: false,
                message: error.message || "Error de red"
            });
            toast.error("Error de conexión");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border-orange-200 bg-orange-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
                    Sincronización de Carga AMA
                </CardTitle>
                <CardDescription>
                    Captura el estado actual de Incidencias y Evolutivos de Jira para el histórico diario.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-orange-100">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-orange-900">Actualización diaria manual</p>
                        <p className="text-xs text-muted-foreground">
                            Este proceso se ejecuta automáticamente a las 3:00 AM, pero puedes lanzarlo manualmente aquí.
                        </p>
                    </div>
                    <Button
                        onClick={runSync}
                        disabled={isSyncing}
                        className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto px-8"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-2 h-4 w-4 fill-white" />
                                Lanzar Sincro de Carga
                            </>
                        )}
                    </Button>
                </div>

                {lastResult && (
                    <div className={`mt-4 p-3 rounded-md border text-sm flex items-start gap-3 ${lastResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                        {lastResult.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                        <div>
                            <p className="font-semibold">{lastResult.message}</p>
                            {lastResult.workload && (
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                    <div className="bg-white/50 p-2 rounded">
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Incidencias</p>
                                        <p className="text-lg font-bold">{lastResult.workload.incidencias}</p>
                                    </div>
                                    <div className="bg-white/50 p-2 rounded">
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Evolutivos</p>
                                        <p className="text-lg font-bold">{lastResult.workload.evolutivos}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
