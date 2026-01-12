"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { syncAllClientData } from "@/app/actions/clients";
import { Loader2, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncClientManager() {
    const { t } = useTranslations();
    const [isSyncing, setIsSyncing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; updatedCount?: number; totalProcessed?: number; errors?: number; error?: string } | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setResult(null);
        try {
            const res = await syncAllClientData();
            setResult(res as any);
            if (res.success) {
                toast.success(t('import.clients.toast.success'));
            } else {
                toast.error(res.error || t('import.clients.toast.error'));
            }
        } catch (error) {
            setResult({ success: false, error: t('import.clients.toast.error') });
            toast.error(t('import.clients.toast.error'));
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border-indigo-200 bg-indigo-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    {t('import.clients.title')}
                </CardTitle>
                <CardDescription>
                    {t('import.clients.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-indigo-100">
                    <div className="text-sm text-muted-foreground max-w-md">
                        <p>{t('import.clients.info')}</p>
                    </div>
                    <Button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto px-8"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('import.clients.syncing')}
                            </>
                        ) : (
                            t('import.clients.button')
                        )}
                    </Button>
                </div>

                {result && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                {result.success ? t('import.clients.result.success') : t('import.clients.result.error')}
                            </p>
                            {result.success && (
                                <div className="text-sm text-green-700 mt-1">
                                    <p>{t('import.clients.result.processed', { count: result.totalProcessed })}</p>
                                    <p>{t('import.clients.result.updated', { count: result.updatedCount })}</p>
                                    {result.errors && result.errors > 0 && (
                                        <p className="text-amber-700">{t('import.clients.result.errors', { count: result.errors })}</p>
                                    )}
                                </div>
                            )}
                            {!result.success && result.error && (
                                <p className="text-sm text-red-700 mt-1">{result.error}</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
