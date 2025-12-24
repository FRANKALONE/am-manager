"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportBulkData, importBulkData } from "@/app/actions/import-export";
import { exportRegularizations, importRegularizations } from "@/app/actions/regularizations-import-export";
import { useState } from "react";

export default function ImportPage() {
    const [status, setStatus] = useState<string>("");
    const [errors, setErrors] = useState<string[]>([]);
    const [regStatus, setRegStatus] = useState<string>("");
    const [regErrors, setRegErrors] = useState<string[]>([]);

    async function handleExport() {
        const csvContent = await exportBulkData();
        // Add BOM for Excel to recognize UTF-8
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `manager_am_backup_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleImport(formData: FormData) {
        setStatus("Procesando...");
        setErrors([]);

        const result = await importBulkData(formData);

        if (result.error) {
            setStatus("Error: " + result.error);
        } else if (result.success) {
            setStatus(`Proceso completado. ${result.count} registros procesados.`);
            if (result.errors) {
                setErrors(result.errors);
            }
        }
    }

    async function handleRegularizationsExport() {
        const csvContent = await exportRegularizations();
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `regularizaciones_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleRegularizationsImport(formData: FormData) {
        setRegStatus("Procesando...");
        setRegErrors([]);

        const result = await importRegularizations(formData);

        if (result.error) {
            setRegStatus("Error: " + result.error);
        } else if (result.success) {
            setRegStatus(`Proceso completado. ${result.count} regularizaciones procesadas.`);
            if (result.errors) {
                setRegErrors(result.errors);
            }
        }
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Importación y Exportación</h1>
                <p className="text-muted-foreground">
                    Gestión masiva de datos mediante ficheros CSV.
                </p>
            </div>

            {/* Work Packages Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Work Packages y Clientes</h2>
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Export Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Exportar Datos (Plantilla)</CardTitle>
                            <CardDescription>
                                Descarga un CSV con todos los datos actuales. Utiliza este archivo como plantilla para cargar nuevos datos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                El archivo incluye Clientes, Proyectos y Work Packages aplanados en una sola fila por WP.
                            </p>
                            <Button onClick={handleExport} variant="outline" className="w-full">
                                Descargar CSV / Plantilla
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Import Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Importar Datos</CardTitle>
                            <CardDescription>
                                Sube un archivo CSV para crear o actualizar registros masivamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={handleImport} className="space-y-4">
                                <div className="space-y-2">
                                    <Input type="file" name="file" accept=".csv" required />
                                    <p className="text-xs text-muted-foreground">
                                        Formato esperado: CSV separado por punto y coma (;).
                                        Usa la exportación para ver las columnas exactas.
                                    </p>
                                </div>
                                <Button type="submit" className="w-full">Subir y Procesar</Button>
                            </form>

                            {status && (
                                <div className={`mt-4 p-4 rounded-md text-sm ${status.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                                    <p className="font-medium">{status}</p>
                                    {errors.length > 0 && (
                                        <ul className="mt-2 list-disc pl-4 space-y-1">
                                            {errors.map((err, idx) => (
                                                <li key={idx} className="text-red-600">{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Regularizations Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Regularizaciones</h2>
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Export Regularizations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Exportar Regularizaciones</CardTitle>
                            <CardDescription>
                                Descarga todas las regularizaciones en formato CSV.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Incluye: Excesos, Devoluciones y Consumos Manuales con todos sus detalles.
                            </p>
                            <Button onClick={handleRegularizationsExport} variant="outline" className="w-full">
                                Descargar Regularizaciones CSV
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Import Regularizations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Importar Regularizaciones</CardTitle>
                            <CardDescription>
                                Sube un CSV para crear o actualizar regularizaciones masivamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={handleRegularizationsImport} className="space-y-4">
                                <div className="space-y-2">
                                    <Input type="file" name="file" accept=".csv" required />
                                    <p className="text-xs text-muted-foreground">
                                        Columnas: ID, Fecha, ClienteID, ClienteNombre, WorkPackageID, WorkPackageNombre, Tipo, Cantidad, Descripcion, TicketID, Nota
                                    </p>
                                    <p className="text-xs text-yellow-600">
                                        ⚠️ MANUAL_CONSUMPTION requiere TicketID obligatorio
                                    </p>
                                </div>
                                <Button type="submit" className="w-full">Subir y Procesar</Button>
                            </form>

                            {regStatus && (
                                <div className={`mt-4 p-4 rounded-md text-sm ${regStatus.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                                    <p className="font-medium">{regStatus}</p>
                                    {regErrors.length > 0 && (
                                        <ul className="mt-2 list-disc pl-4 space-y-1">
                                            {regErrors.map((err, idx) => (
                                                <li key={idx} className="text-red-600">{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
