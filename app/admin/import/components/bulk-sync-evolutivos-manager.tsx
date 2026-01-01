"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { syncTotalEvolutivos } from "@/app/actions/evolutivos";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function BulkSyncEvolutivosManager() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const runBulkSync = async () => {
        if (!confirm("¿Deseas iniciar la sincronización de TODOS los Evolutivos e Hitos? Este proceso consultará todos los proyectos JIRA asociados a clientes.")) {
            return;
        }

        setIsSyncing(true);
        setSuccess(null);

        try {
            const res = await syncTotalEvolutivos();
            if (res.success) {
                const msg = res.message || "Sincronización finalizada";
                setSuccess(msg);
                toast.success(msg);
            } else {
                toast.error(res.error || res.message || "Error en la sincronización");
            }
        } catch (err: any) {
            toast.error("Error crítico en la sincronización de evolutivos");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border-jade/20 bg-jade/5 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 text-jade ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronización Total de Evolutivos
                </CardTitle>
                <CardDescription>
                    Actualiza todos los tickets de tipo Evolutivo e Hito para todos los clientes configurados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-jade/10">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground max-w-md">
                            Este proceso busca tickets en JIRA para todos los proyectos asociados a clientes. Es independiente de la sincronización de consumos.
                        </p>
                        {success && (
                            <p className="text-xs text-jade font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {success}
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={runBulkSync}
                        disabled={isSyncing}
                        className="bg-jade hover:bg-jade/90 text-white w-full sm:w-auto px-8"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sincronizando...
                            </>
                        ) : (
                            "Sincronizar Evolutivos"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
