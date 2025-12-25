"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportBulkData, importBulkData } from "@/app/actions/import-export";
import { exportRegularizations, importRegularizations } from "@/app/actions/regularizations-import-export";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportPage() {
    const [status, setStatus] = useState<string>("");
    const [errors, setErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importInfo, setImportInfo] = useState<{ totalRows?: number; delimiter?: string } | null>(null);

    const [regStatus, setRegStatus] = useState<string>("");
    const [regErrors, setRegErrors] = useState<string[]>([]);
    const [isRegImporting, setIsRegImporting] = useState(false);
    const [regImportInfo, setRegImportInfo] = useState<{ totalRows?: number; delimiter?: string } | null>(null);

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
        setIsImporting(true);
        setStatus("Importando datos...");
        setErrors([]);
        setImportInfo(null);

        try {
            const result = await importBulkData(formData);

            if (result.error) {
                setStatus("");
                setErrors([result.error]);
            } else if (result.success) {
                setStatus(`✓ Importación completada: ${result.count} de ${result.totalRows || result.count} registros procesados correctamente`);
                setImportInfo({
                    totalRows: result.totalRows,
                    delimiter: result.delimiter
                });
                if (result.errors) {
                    setErrors(result.errors);
                }
            }
        } catch (error) {
            setStatus("");
            setErrors([`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
        } finally {
            setIsImporting(false);
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
        setIsRegImporting(true);
        setRegStatus("Importando regularizaciones...");
        setRegErrors([]);
        setRegImportInfo(null);

        try {
            const result = await importRegularizations(formData);

            if (result.error) {
                setRegStatus("");
                setRegErrors([result.error]);
            } else if (result.success) {
                setRegStatus(`✓ Importación completada: ${result.count} de ${result.totalRows || result.count} regularizaciones procesadas correctamente`);
                setRegImportInfo({
                    totalRows: result.totalRows,
                    delimiter: result.delimiter
                });
                if (result.errors) {
                    setRegErrors(result.errors);
                }
            }
        } catch (error) {
            setRegStatus("");
            setRegErrors([`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`]);
        } finally {
            setIsRegImporting(false);
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
                                    <Input
                                        type="file"
                                        name="file"
                                        accept=".csv"
                                        required
                                        disabled={isImporting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Formato: CSV delimitado por <strong>coma (,)</strong> o <strong>punto y coma (;)</strong> - detección automática.
                                        Codificación: UTF-8.
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isImporting}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        "Subir y Procesar"
                                    )}
                                </Button>
                            </form>

                            {/* Success Status */}
                            {status && !isImporting && (
                                <Alert className="mt-4 bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Éxito</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        {status}
                                        {importInfo && (
                                            <div className="mt-2 text-xs">
                                                <Info className="inline h-3 w-3 mr-1" />
                                                Delimitador detectado: <strong>{importInfo.delimiter}</strong>
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Loading Status */}
                            {isImporting && (
                                <Alert className="mt-4 bg-blue-50 border-blue-200">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <AlertTitle className="text-blue-800">Procesando</AlertTitle>
                                    <AlertDescription className="text-blue-700">
                                        Importando datos, por favor espere...
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Errors */}
                            {errors.length > 0 && !isImporting && (
                                <Alert className="mt-4 bg-red-50 border-red-200">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800">
                                        {status ? "Importación completada con errores" : "Error en la importación"}
                                    </AlertTitle>
                                    <AlertDescription className="text-red-700">
                                        <details className="mt-2">
                                            <summary className="cursor-pointer font-medium">
                                                {errors.length} error{errors.length > 1 ? 'es' : ''} encontrado{errors.length > 1 ? 's' : ''} (click para ver detalles)
                                            </summary>
                                            <ul className="mt-2 list-disc pl-4 space-y-1 text-sm max-h-60 overflow-y-auto">
                                                {errors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    </AlertDescription>
                                </Alert>
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
                                    <Input
                                        type="file"
                                        name="file"
                                        accept=".csv"
                                        required
                                        disabled={isRegImporting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Formato: CSV delimitado por <strong>coma (,)</strong> o <strong>punto y coma (;)</strong> - detección automática.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Columnas: ID, Fecha, ClienteID, ClienteNombre, WorkPackageID, WorkPackageNombre, Tipo, Cantidad, Descripcion, TicketID, Nota
                                    </p>
                                    <p className="text-xs text-yellow-600">
                                        ⚠️ MANUAL_CONSUMPTION requiere TicketID obligatorio
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isRegImporting}
                                >
                                    {isRegImporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        "Subir y Procesar"
                                    )}
                                </Button>
                            </form>

                            {/* Success Status */}
                            {regStatus && !isRegImporting && (
                                <Alert className="mt-4 bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Éxito</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        {regStatus}
                                        {regImportInfo && (
                                            <div className="mt-2 text-xs">
                                                <Info className="inline h-3 w-3 mr-1" />
                                                Delimitador detectado: <strong>{regImportInfo.delimiter}</strong>
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Loading Status */}
                            {isRegImporting && (
                                <Alert className="mt-4 bg-blue-50 border-blue-200">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <AlertTitle className="text-blue-800">Procesando</AlertTitle>
                                    <AlertDescription className="text-blue-700">
                                        Importando regularizaciones, por favor espere...
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Errors */}
                            {regErrors.length > 0 && !isRegImporting && (
                                <Alert className="mt-4 bg-red-50 border-red-200">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800">
                                        {regStatus ? "Importación completada con errores" : "Error en la importación"}
                                    </AlertTitle>
                                    <AlertDescription className="text-red-700">
                                        <details className="mt-2">
                                            <summary className="cursor-pointer font-medium">
                                                {regErrors.length} error{regErrors.length > 1 ? 'es' : ''} encontrado{regErrors.length > 1 ? 's' : ''} (click para ver detalles)
                                            </summary>
                                            <ul className="mt-2 list-disc pl-4 space-y-1 text-sm max-h-60 overflow-y-auto">
                                                {regErrors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
