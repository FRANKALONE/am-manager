"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, RefreshCw, CheckCircle2, AlertCircle, Trash2, ShieldCheck } from "lucide-react";
import { repairRegularizationSequence } from "@/app/actions/regularizations";
import { cleanupManualConsumptions, applyReviewedForDuplicatesMigration } from "@/app/actions/maintenance";

import { useTranslations } from "@/lib/use-translations";

export function DatabaseMaintenance() {
    const { t } = useTranslations();
    const [isRepairing, setIsRepairing] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [cleanupDetails, setCleanupDetails] = useState<any[]>([]);

    const handleRepair = async () => {
        if (!confirm(t('admin.maintenance.repair.confirm'))) {
            return;
        }

        setIsRepairing(true);
        setResult(null);

        try {
            const res = await repairRegularizationSequence();
            if (res.success) {
                setResult({ success: true, message: t('admin.maintenance.repair.success') });
            } else {
                setResult({ success: false, message: res.error || t('common.error') });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setIsRepairing(false);
        }
    };

    const handleCleanup = async (dryRun: boolean) => {
        if (!dryRun && !confirm(t('admin.maintenance.cleanup.confirm'))) {
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
                    message: res.message || t('admin.maintenance.cleanup.success')
                });
                if (res.details && res.details.length > 0) {
                    setCleanupDetails(res.details);
                }
            } else {
                setResult({ success: false, message: res.error || t('common.error') });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setIsRepairing(false);
        }
    };

    const handleApplyMigration = async () => {
        if (!confirm(t('admin.maintenance.migration.confirm'))) {
            return;
        }

        setIsRepairing(true);
        setResult(null);

        try {
            const res = await applyReviewedForDuplicatesMigration();
            if (res.success) {
                setResult({
                    success: true,
                    message: res.alreadyExists
                        ? t('admin.maintenance.migration.exists')
                        : t('admin.maintenance.migration.success')
                });
            } else {
                setResult({ success: false, message: res.error || t('common.error') });
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
                    <CardTitle>{t('admin.maintenance.db.title')}</CardTitle>
                </div>
                <CardDescription>
                    {t('admin.maintenance.db.subtitle')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-orange-200 rounded-lg bg-white/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">{t('admin.maintenance.repair.title')}</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            {t('admin.maintenance.repair.desc')}
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
                        {t('admin.maintenance.repair.button')}
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-green-200 rounded-lg bg-green-50/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">{t('admin.maintenance.migration.title')}</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            {t('admin.maintenance.migration.desc')}
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
                        {t('admin.maintenance.migration.button')}
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">{t('admin.maintenance.cleanup.title')}</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            {t('admin.maintenance.cleanup.desc')}
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
                            {t('admin.maintenance.cleanup.simulate')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCleanup(false)}
                            disabled={isRepairing}
                            className="font-bold"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('admin.maintenance.cleanup.clean')}
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
                                {t('admin.maintenance.cleanup.details', { count: cleanupDetails.length })}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">{t('admin.maintenance.table.ticket')}</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">{t('admin.maintenance.table.wp')}</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-700">{t('admin.maintenance.table.month')}</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-700">{t('admin.maintenance.table.manual')}</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-700">{t('admin.maintenance.table.sync')}</th>
                                        <th className="px-4 py-2 text-center font-medium text-gray-700">{t('admin.maintenance.table.match')}</th>
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
                                                        ✓ {t('admin.maintenance.table.exact')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        ≈ {t('admin.maintenance.table.approx')}
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
