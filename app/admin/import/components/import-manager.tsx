"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportBulkData, importBulkData } from "@/app/actions/import-export";
import { exportRegularizations, importRegularizations } from "@/app/actions/regularizations-import-export";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "@/lib/use-translations";

export function ImportManager() {
    const { t } = useTranslations();
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
        setStatus(t('import.manager.importing'));
        setErrors([]);
        setImportInfo(null);

        try {
            const result = await importBulkData(formData);

            if (result.error) {
                setStatus("");
                setErrors([result.error]);
            } else if (result.success) {
                setStatus(`${t('import.manager.toast.success')}: ${result.count} / ${result.totalRows || result.count}`);
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
            setErrors([`${t('import.manager.toast.unexpected')}: ${error instanceof Error ? error.message : 'Error'}`]);
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
        setRegStatus(t('import.manager.importing'));
        setRegErrors([]);
        setRegImportInfo(null);

        try {
            const result = await importRegularizations(formData);

            if (result.error) {
                setRegStatus("");
                setRegErrors([result.error]);
            } else if (result.success) {
                setRegStatus(`${t('import.manager.toast.success')}: ${result.count} / ${result.totalRows || result.count}`);
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
            setRegErrors([`${t('import.manager.toast.unexpected')}: ${error instanceof Error ? error.message : 'Error'}`]);
        } finally {
            setIsRegImporting(false);
        }
    }

    return (
        <div className="space-y-8">
            {/* Work Packages Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">{t('import.manager.wpTitle')}</h2>
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Export Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('import.manager.exportTitle')}</CardTitle>
                            <CardDescription>
                                {t('import.manager.exportDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('import.manager.exportInfo')}
                            </p>
                            <Button onClick={handleExport} variant="outline" className="w-full">
                                {t('import.manager.exportButton')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Import Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('import.manager.importTitle')}</CardTitle>
                            <CardDescription>
                                {t('import.manager.importDesc')}
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
                                        {t('import.manager.importFormat')}
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
                                            {t('import.manager.importing')}
                                        </>
                                    ) : (
                                        t('import.manager.importButton')
                                    )}
                                </Button>
                            </form>

                            {status && !isImporting && (
                                <Alert className="mt-4 bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">{t('common.success')}</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        {status}
                                        {importInfo && (
                                            <div className="mt-2 text-xs">
                                                <Info className="inline h-3 w-3 mr-1" />
                                                {t('import.manager.delimiter')}: <strong>{importInfo.delimiter}</strong>
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {isImporting && (
                                <Alert className="mt-4 bg-blue-50 border-blue-200">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <AlertTitle className="text-blue-800">{t('import.manager.processingTitle')}</AlertTitle>
                                    <AlertDescription className="text-blue-700">
                                        {t('import.manager.processingDesc')}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {errors.length > 0 && !isImporting && (
                                <Alert className="mt-4 bg-red-50 border-red-200">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-red-800">
                                        {status ? t('import.manager.toast.partial') : t('import.manager.toast.error')}
                                    </AlertTitle>
                                    <AlertDescription className="text-red-700">
                                        <details className="mt-2">
                                            <summary className="cursor-pointer font-medium">
                                                {t('import.manager.errorsFound', { count: errors.length })}
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
                <h2 className="text-xl font-semibold mb-4">{t('import.manager.regTitle')}</h2>
                <div className="grid gap-8 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('import.manager.regExportTitle')}</CardTitle>
                            <CardDescription>
                                {t('import.manager.regExportDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button onClick={handleRegularizationsExport} variant="outline" className="w-full">
                                {t('import.manager.regExportButton')}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('import.manager.regImportTitle')}</CardTitle>
                            <CardDescription>
                                {t('import.manager.regImportDesc')}
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
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isRegImporting}
                                >
                                    {isRegImporting ? t('import.manager.importing') : t('import.manager.importButton')}
                                </Button>
                            </form>

                            {regStatus && !isRegImporting && (
                                <Alert className="mt-4 bg-green-50 border-green-200">
                                    <AlertTitle className="text-green-800">{t('common.success')}</AlertTitle>
                                    <AlertDescription className="text-green-700">{regStatus}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
