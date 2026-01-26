"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Info,
    CheckCircle2,
    XCircle,
    Clock,
    Star
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/use-translations";

export interface ValidityPeriod {
    id: number;
    startDate: string | Date;
    endDate: string | Date;
    totalQuantity: number;
    rate: number;
    isPremium: boolean;
    contractType?: string;
    scopeUnit?: string;
    premiumPrice?: number;
    surplusStrategy?: string;
    regularizationType?: string;
    regularizationRate?: number;
    rateEvolutivo?: number;
    billingType?: string;
}

export interface SelectedPeriod extends ValidityPeriod {
    wpName: string;
    clientName: string;
    renewalType: string;
    contractType: string;
    billingType: string;
}

interface ContractDetailsModalProps {
    selectedPeriod: SelectedPeriod | null;
    onClose: () => void;
}

export function ContractDetailsModal({ selectedPeriod, onClose }: ContractDetailsModalProps) {
    const { t } = useTranslations();

    return (
        <Dialog open={!!selectedPeriod} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl border-t-8 border-t-malachite rounded-xl shadow-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-dark-green uppercase">
                        {t("admin.analytics.filters.contractDetails")}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        {selectedPeriod?.clientName} • {selectedPeriod?.wpName}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("admin.analytics.filters.validity")}</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-malachite" />
                                        <span className="text-sm font-semibold">{t("admin.analytics.filters.start")}:</span>
                                    </div>
                                    <span className="text-sm">{selectedPeriod && format(new Date(selectedPeriod.startDate), "dd/MM/yyyy")}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-rose-500" />
                                        <span className="text-sm font-semibold">{t("admin.analytics.filters.end")}:</span>
                                    </div>
                                    <span className="text-sm font-bold text-rose-600">{selectedPeriod && format(new Date(selectedPeriod.endDate), "dd/MM/yyyy")}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-semibold">{t("admin.analytics.filters.status")}:</span>
                                    </div>
                                    {selectedPeriod && new Date(selectedPeriod.endDate) < new Date() ? (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> {t("admin.analytics.filters.expired")}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 text-white">
                                            <CheckCircle2 className="w-3 h-3" /> {t("admin.analytics.filters.active")}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("admin.analytics.filters.configuration")}</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{t("admin.analytics.filters.contractType")}:</span>
                                    <Badge variant="outline" className="bg-white text-dark-green uppercase">{selectedPeriod?.contractType}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{t("admin.analytics.filters.renewalType")}:</span>
                                    <Badge variant="outline" className="bg-white text-dark-green uppercase">{selectedPeriod?.renewalType === 'AUTO' ? t("admin.analytics.filters.automation") : t("admin.analytics.filters.onDemand")}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{t("admin.analytics.filters.billingPeriod")}:</span>
                                    <Badge variant="outline" className="bg-white text-dark-green uppercase">{selectedPeriod?.billingType || "-"}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{t("admin.analytics.filters.level")}:</span>
                                    {selectedPeriod?.isPremium ? (
                                        <span className="text-amber-600 font-bold flex items-center gap-1">
                                            <Star className="w-4 h-4 fill-amber-500" /> PREMIUM
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 font-bold uppercase text-[10px]">{t("admin.analytics.filters.standard")}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-inner relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-10">
                                <Info className="w-24 h-24" />
                            </div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t("admin.analytics.filters.economicConditions")}</h4>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <span className="block text-xs text-slate-400 mb-1">{t("admin.analytics.filters.contractedVolume")}</span>
                                    <span className="text-3xl font-bold tracking-tight text-white">
                                        {selectedPeriod?.totalQuantity} <span className="text-sm font-normal text-slate-400">{selectedPeriod?.scopeUnit || t("admin.analytics.filters.hours")}</span>
                                    </span>
                                </div>
                                <div className="flex gap-6">
                                    <div>
                                        <span className="block text-xs text-slate-400 mb-1">{t("admin.analytics.filters.unitRate")}</span>
                                        <span className="text-xl font-bold text-white">{selectedPeriod?.rate} €</span>
                                    </div>
                                    {selectedPeriod?.isPremium && (
                                        <div>
                                            <span className="block text-xs text-slate-400 mb-1">{t("admin.analytics.filters.premiumPrice")}</span>
                                            <span className="text-xl font-bold text-amber-400">{selectedPeriod?.premiumPrice} €</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-3 border-t border-slate-700">
                                    <div className="flex justify-between text-xs mb-1 text-slate-400">
                                        <span>{t("admin.analytics.filters.surplusMaintenance")}:</span>
                                        <span className="text-white font-medium uppercase font-bold">{selectedPeriod?.surplusStrategy || t("admin.analytics.filters.billing")}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>{t("admin.analytics.filters.regularization")}:</span>
                                        <span className="text-white font-medium uppercase font-bold">{selectedPeriod?.regularizationType || t("admin.analytics.filters.quarterly")}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 border-t border-slate-700 pt-2 mt-2">
                                        <span>{t("admin.analytics.filters.regularizationRate")}:</span>
                                        <span className="text-white font-bold">{selectedPeriod?.regularizationRate ?? 0} €</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>{t("admin.analytics.filters.evolutivoRate")}:</span>
                                        <span className="text-white font-bold">{selectedPeriod?.rateEvolutivo ?? 0} €</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full bg-malachite hover:bg-jade text-white font-bold" onClick={onClose}>
                            {t("admin.analytics.filters.closeDetails")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
