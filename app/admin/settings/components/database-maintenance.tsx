"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, RefreshCw, CheckCircle2, AlertCircle, Trash2, ShieldCheck } from "lucide-react";
import { repairRegularizationSequence } from "@/app/actions/regularizations";
import { cleanupManualConsumptions, applyReviewedForDuplicatesMigration } from "@/app/actions/maintenance";

export function DatabaseMaintenance() {
    const [isRepairing, setIsRepairing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [cleanupDetails, setCleanupDetails] = useState<any[]>([]);

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

    const handleCleanup = async (dryRun: boolean) => {
        if (!dryRun && !confirm("¿Seguro que quieres eliminar los consumos manuales duplicados? Esta acción es irreversible.")) {
            return;
        }

        setIsRepairing(true);
        setResult(null);
        setCleanupDetails([]);

        try {
            const res = await cleanupManualConsumptions(undefined, dryRun);
            if (res.success) {
                setResult({
                    success: true,
                    message: res.message || "Limpieza completada."
                });
                if (res.details && res.details.length > 0) {
                    setCleanupDetails(res.details);
                }
            } else {
                setResult({ success: false, message: res.error || "Error al realizar la limpieza." });
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

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-green-200 rounded-lg bg-green-50/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">Aplicar Migración: reviewedForDuplicates</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            Agrega el campo necesario para el sistema de limpieza selectiva de duplicados. Ejecuta esto solo una vez.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyMigration}
                        disabled={isRepairing}
                        className="border-green-300 hover:bg-green-100/50 text-green-700 font-bold"
                    >
                        {isRepairing ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Aplicar Migración
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">Limpieza de Evolutivos T&M</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            Elimina consumos manuales que coinciden con tickets ya sincronizados automáticamente por la nueva lógica de Issue Key.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCleanup(true)}
                            disabled={isRepairing}
                            className="border-blue-300 hover:bg-blue-100/50 text-blue-700 font-bold"
                        >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Simular
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCleanup(false)}
                            disabled={isRepairing}
                            className="font-bold"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Limpiar Reales
                        </Button>
                    </div>
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

                {cleanupDetails.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b">
                            <p className="text-sm font-medium text-blue-900">
                                Detalles de consumos manuales duplicados ({cleanupDetails.length})
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Ticket</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">WP</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Mes</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-700">Horas Manuales</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-700">Horas Sincronizadas</th>
                                        <th className="px-4 py-2 text-center font-medium text-gray-700">Coincidencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cleanupDetails.map((detail, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-mono text-xs">{detail.ticketId}</td>
                                            <td className="px-4 py-2 text-xs text-gray-600">{detail.wpId}</td>
                                            <td className="px-4 py-2 text-xs">{detail.month}</td>
                                            <td className="px-4 py-2 text-right font-medium">{detail.manualHours}h</td>
                                            <td className="px-4 py-2 text-right font-medium">{detail.syncHours}h</td>
                                            <td className="px-4 py-2 text-center">
                                                {detail.exactMatch ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        ✓ Exacta
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        ≈ Aproximada
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
