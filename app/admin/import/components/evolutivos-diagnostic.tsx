"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { diagnoseEvolutivosSync } from "@/app/actions/diagnose";
import { Loader2, Search, AlertTriangle, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";

interface Props {
    clients: any[];
}

export function EvolutivosDiagnostic({ clients }: Props) {
    const { t, locale } = useTranslations();
    const [selectedClientId, setSelectedClientId] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);

    const runDiagnostic = async () => {
        if (!selectedClientId) {
            toast.error(t('import.diagnostics.evolutivos.toast.select'));
            return;
        }

        setIsRunning(true);
        setResults(null);

        try {
            const res = await diagnoseEvolutivosSync(selectedClientId);

            if (res.success) {
                setResults(res.data);
                toast.success(t('import.diagnostics.evolutivos.toast.success'));
            } else {
                toast.error(res.error || t('import.diagnostics.evolutivos.toast.error'));
            }
        } catch (error: any) {
            toast.error(t('import.diagnostics.evolutivos.toast.critical'));
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Card className="border-orange-200 bg-orange-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-orange-500" />
                    {t('import.diagnostics.evolutivos.title')}
                </CardTitle>
                <CardDescription>
                    {t('import.diagnostics.evolutivos.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="client-select">{t('import.diagnostics.evolutivos.clientLabel')}</Label>
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger id="client-select">
                                <SelectValue placeholder={t('import.diagnostics.evolutivos.clientPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={runDiagnostic}
                        disabled={!selectedClientId || isRunning}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('import.diagnostics.evolutivos.running')}
                            </>
                        ) : (
                            <>
                                <Search className="mr-2 h-4 w-4" />
                                {t('import.diagnostics.evolutivos.button')}
                            </>
                        )}
                    </Button>
                </div>

                {results && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="bg-white/50 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-2">{t('import.diagnostics.evolutivos.clientLabel')}: {results.client.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('admin.workPackages')}: {results.client.projectKeys.join(', ')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">JIRA</p>
                                <p className="text-2xl font-bold text-blue-600">{results.jira.evolutivos}</p>
                                <p className="text-xs text-muted-foreground">{t('admin.evolutivos')}</p>
                                {results.jira.paginationWarning && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>Faltan {results.jira.missingCount} por paginación</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">BASE DE DATOS</p>
                                <p className="text-2xl font-bold text-green-600">{results.database.evolutivos}</p>
                                <p className="text-xs text-muted-foreground">{t('admin.evolutivos')}</p>
                            </div>
                        </div>

                        {results.discrepancies.missingInDb.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <h4 className="font-semibold text-red-900">
                                        {t('import.diagnostics.evolutivos.discrepancyTitleMissing', { count: results.discrepancies.missingInDb.length })}
                                    </h4>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {results.discrepancies.missingInDb.map((ticket: any) => (
                                        <div key={ticket.key} className="bg-white p-3 rounded border text-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="font-medium">{ticket.key}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{ticket.summary}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Badge variant="outline">{ticket.status}</Badge>
                                                        <Badge variant="secondary">{ticket.billingMode}</Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(ticket.created, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.discrepancies.extraInDb.length > 0 && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    <h4 className="font-semibold text-amber-900">
                                        {t('import.diagnostics.evolutivos.discrepancyTitleExtra', { count: results.discrepancies.extraInDb.length })}
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    {results.discrepancies.extraInDb.map((ticket: any) => (
                                        <div key={ticket.key} className="bg-white p-2 rounded border text-sm">
                                            <p className="font-medium">{ticket.key}</p>
                                            <p className="text-xs text-muted-foreground">{ticket.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.discrepancies.missingInDb.length === 0 && results.discrepancies.extraInDb.length === 0 && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="font-semibold text-green-900">{t('import.diagnostics.evolutivos.synced')}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('import.diagnostics.evolutivos.syncedDesc')}
                                </p>
                            </div>
                        )}

                        <details className="bg-slate-50 p-3 rounded border text-xs">
                            <summary className="cursor-pointer font-medium">{t('import.diagnostics.evolutivos.jqlLabel')}</summary>
                            <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded overflow-x-auto">
                                {results.jql}
                            </pre>
                        </details>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
