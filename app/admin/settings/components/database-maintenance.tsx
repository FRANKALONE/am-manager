"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { repairRegularizationSequence } from "@/app/actions/regularizations";

export function DatabaseMaintenance() {
    const [isRepairing, setIsRepairing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleRepair = async () => {
        if (!confirm("Esto sincronizará las secuencias de IDs de la base de datos para evitar errores de duplicidad. ¿Continuar?")) {
            return;
        }

        setIsRepairing(true);
        setResult(null);

        try {
            const res = await repairRegularizationSequence();
            if (res.success) {
                setResult({ success: true, message: "Secuencias de IDs reparadas correctamente." });
            } else {
                setResult({ success: false, message: res.error || "Error desconocido al reparar secuencias." });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setIsRepairing(false);
        }
    };

    return (
        <Card className="border-orange-200 bg-orange-50/10">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    <CardTitle>Mantenimiento de Base de Datos</CardTitle>
                </div>
                <CardDescription>
                    Herramientas para corregir problemas de integridad y sincronización.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-orange-200 rounded-lg bg-white/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">Sincronizar Secuencias de IDs</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            Corrige el error "Unique constraint failed" al crear registros si se han realizado importaciones manuales previas.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRepair}
                        disabled={isRepairing}
                        className="border-orange-300 hover:bg-orange-100/50 text-orange-700 font-bold"
                    >
                        {isRepairing ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Reparar Secuencias
                    </Button>
                </div>

                {result && (
                    <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                        {result.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        {result.message}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
