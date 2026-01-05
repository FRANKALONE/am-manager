"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { syncEvolutivoProposals } from "@/app/actions/evolutivo-proposals";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

export function BulkSyncProposalsManager() {
    const { t } = useTranslations();
    const [isSyncing, setIsSyncing] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const runBulkSync = async () => {
        if (!confirm(t('import.proposals.confirm'))) {
            return;
        }

        setIsSyncing(true);
        setSuccess(null);

        try {
            const res = await syncEvolutivoProposals();
            if (res.success) {
                const msg = res.message || t('import.proposals.toast.success');
                setSuccess(msg);
                toast.success(msg);
            } else {
                toast.error(res.error || t('import.proposals.toast.error'));
            }
        } catch (err: any) {
            toast.error(t('import.proposals.toast.critical'));
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="border-amber-200 bg-amber-50/10 shadow-sm border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className={`h-5 w-5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    {t('import.proposals.title')}
                </CardTitle>
                <CardDescription>
                    {t('import.proposals.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/50 rounded-lg border border-amber-100">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground max-w-md">
                            {t('import.proposals.warning')}
                        </p>
                        {success && (
                            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {success}
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={runBulkSync}
                        disabled={isSyncing}
                        className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto px-8"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('import.proposals.syncing')}
                            </>
                        ) : (
                            t('import.proposals.button')
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
