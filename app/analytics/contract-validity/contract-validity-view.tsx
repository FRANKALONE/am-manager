"use client";

import React, { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, startOfYear, endOfYear, addYears, subYears } from "date-fns";
import { es } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Filter,
    Info,
    CheckCircle2,
    XCircle,
    User,
    Briefcase,
    Settings2,
    Clock,
    Search,
    ChevronFirst,
    ChevronLast,
    Star
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";

interface ValidityPeriod {
    id: number;
    startDate: Date;
    endDate: Date;
    totalQuantity: number;
    rate: number;
    isPremium: boolean;
    contractType?: string;
    scopeUnit?: string;
    premiumPrice?: number;
    surplusStrategy?: string;
    regularizationType?: string;
}

interface WorkPackage {
    id: string;
    name: string;
    contractType: string;
    renewalType: string;
    validityPeriods: ValidityPeriod[];
}

interface Client {
    id: string;
    name: string;
    workPackages: WorkPackage[];
}

interface Props {
    initialData: Client[];
}

export function ContractValidityView({ initialData }: Props) {
    const t = useTranslations("admin.analytics");
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedPeriod, setSelectedPeriod] = useState<(ValidityPeriod & { wpName: string, clientName: string, renewalType: string, contractType: string }) | null>(null);
    const [filters, setFilters] = useState({
        client: "all",
        contractType: "all",
        renewalType: "all",
        premium: "all",
        search: ""
    });

    // Generate 12 months for the timeline
    const months = useMemo(() => {
        const start = startOfMonth(viewDate);
        return Array.from({ length: 12 }).map((_, i) => addMonths(start, i));
    }, [viewDate]);

    // Handle filters
    const filteredData = useMemo(() => {
        return initialData.map(client => ({
            ...client,
            workPackages: client.workPackages.filter((wp: WorkPackage) => {
                const matchesClient = filters.client === "all" || client.id === filters.client;
                const matchesType = filters.contractType === "all" || wp.contractType === filters.contractType;
                const matchesRenewal = filters.renewalType === "all" || wp.renewalType === filters.renewalType;
                const matchesSearch = !filters.search ||
                    wp.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                    client.name.toLowerCase().includes(filters.search.toLowerCase());

                // For periods within WP
                const hasMatchingPeriod = wp.validityPeriods.some((vp: ValidityPeriod) => {
                    const matchesPremium = filters.premium === "all" ||
                        (filters.premium === "premium" && vp.isPremium) ||
                        (filters.premium === "standard" && !vp.isPremium);
                    return matchesPremium;
                });

                return matchesClient && matchesType && matchesRenewal && matchesSearch && hasMatchingPeriod;
            })
        })).filter(client => client.workPackages.length > 0);
    }, [initialData, filters]);

    // Navigation functions
    const nextMonth = () => setViewDate(prev => addMonths(prev, 1));
    const prevMonth = () => setViewDate(prev => subMonths(prev, 1));
    const nextYear = () => setViewDate(prev => addYears(prev, 1));
    const prevYear = () => setViewDate(prev => subYears(prev, 1));
    const resetToToday = () => setViewDate(new Date());

    // Helper to calculate bar width and position
    const getPeriodStyle = (startDate: string | Date, endDate: string | Date, timelineMonths: Date[]) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timelineStart = timelineMonths[0];
        const timelineEnd = endOfMonth(timelineMonths[timelineMonths.length - 1]);

        if (end < timelineStart || start > timelineEnd) return null;

        const monthWidth = 100 / 12;

        let startOffset = 0;
        let width = 0;

        timelineMonths.forEach((m, i) => {
            const mStart = startOfMonth(m);
            const mEnd = endOfMonth(m);

            // Check if start of period is in this month
            if (isWithinInterval(start, { start: mStart, end: mEnd })) {
                const daysInMonth = mEnd.getDate();
                const startDay = start.getDate();
                startOffset = (i * monthWidth) + ((startDay - 1) / daysInMonth) * monthWidth;
            } else if (start < mStart && end >= mStart && startOffset === 0 && i === 0) {
                // Period starts before current view
                startOffset = 0;
            }

            // Check if end of period is in this month
            if (isWithinInterval(end, { start: mStart, end: mEnd })) {
                const daysInMonth = mEnd.getDate();
                const endDay = end.getDate();
                const endPos = (i * monthWidth) + (endDay / daysInMonth) * monthWidth;
                width = endPos - startOffset;
            } else if (end > mEnd && start <= mEnd) {
                // Period covers this month or parts of it
                if (i === 11) {
                    width = 100 - startOffset;
                }
            }
        });

        // Ensure width is at least something if it overlaps the view
        if (width === 0 && end >= timelineStart && start <= timelineEnd) {
            width = 100 - startOffset;
        }

        return {
            left: `${Math.max(0, startOffset)}%`,
            width: `${Math.min(100 - startOffset, width)}%`
        };
    };

    return (
        <div className="space-y-6 text-slate-900">
            {/* Filter Bar */}
            <Card className="border-t-4 border-t-malachite shadow-lg overflow-visible z-20">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <User className="w-3 h-3" /> {t("filters.client")}
                            </label>
                            <Select onValueChange={(v) => setFilters(f => ({ ...f, client: v }))} defaultValue="all">
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={t("filters.client")} />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="all">{t("filters.allClients")}</SelectItem>
                                    {initialData.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3" /> {t("filters.contractType")}
                            </label>
                            <Select onValueChange={(v) => setFilters(f => ({ ...f, contractType: v }))} defaultValue="all">
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={t("filters.contractType")} />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                                    <SelectItem value="BOLSA">BOLSA ({t("filters.hours")})</SelectItem>
                                    <SelectItem value="BD">BAJO DEMANDA</SelectItem>
                                    <SelectItem value="EVENTOS">EVENTOS</SelectItem>
                                    <SelectItem value="SLA">SLA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <Settings2 className="w-3 h-3" /> {t("filters.renewal")}
                            </label>
                            <Select onValueChange={(v) => setFilters(f => ({ ...f, renewalType: v }))} defaultValue="all">
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={t("filters.renewal")} />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                                    <SelectItem value="AUTO">{t("filters.automation")}</SelectItem>
                                    <SelectItem value="BP">{t("filters.onDemand")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                <Star className="w-3 h-3" /> {t("filters.serviceLevel")}
                            </label>
                            <Select onValueChange={(v) => setFilters(f => ({ ...f, premium: v }))} defaultValue="all">
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={t("filters.serviceLevel")} />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                                    <SelectItem value="premium">{t("filters.premium")}</SelectItem>
                                    <SelectItem value="standard">{t("filters.standard")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={t("filters.search")}
                                className="pl-9 bg-white"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timeline View */}
            <Card className="shadow-xl border-none overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-lg font-bold text-dark-green flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-malachite" />
                        {t("timeline")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-white rounded-lg border shadow-sm p-1">
                            <Button variant="ghost" size="icon" onClick={prevYear} title={t("prevYear")}>
                                <ChevronFirst className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={prevMonth} title={t("prevMonth")}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="px-4 font-bold text-sm min-w-[140px] hover:bg-transparent"
                                onClick={resetToToday}
                            >
                                {format(viewDate, "MMMM yyyy", { locale: es }).toUpperCase()}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextMonth} title={t("nextMonth")}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextYear} title={t("nextYear")}>
                                <ChevronLast className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto scrollbar-thin">
                    <div className="min-w-[1200px]">
                        {/* Headers */}
                        <div className="flex border-b bg-slate-50/30">
                            <div className="w-[300px] border-r p-4 font-bold text-xs text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 shrink-0">
                                {t("filters.clientWpHeader")}
                            </div>
                            <div className="flex-1 flex">
                                {months.map((m, i) => (
                                    <div key={i} className="flex-1 text-center py-4 border-r last:border-r-0 font-bold text-xs text-slate-600">
                                        {format(m, "MMM-yy", { locale: es }).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Data Rows */}
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {filteredData.map(client => (
                                <React.Fragment key={client.id}>
                                    {/* Client Row */}
                                    <div className="flex bg-slate-50/20 group">
                                        <div className="w-[300px] border-r p-3 font-bold text-sm text-dark-green sticky left-0 bg-slate-50/80 backdrop-blur-sm z-10 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-malachite" />
                                            {client.name}
                                        </div>
                                        <div className="flex-1 flex bg-slate-50/10">
                                            {months.map((_, i) => (
                                                <div key={i} className="flex-1 border-r last:border-r-0" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* WP Rows */}
                                    {client.workPackages.map((wp: WorkPackage) => (
                                        <div key={wp.id} className="flex hover:bg-slate-50 transition-colors">
                                            <div className="w-[300px] border-r p-3 pl-8 text-xs font-medium text-slate-600 sticky left-0 bg-white z-10 truncate group" title={wp.name}>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="truncate">{wp.name}</span>
                                                    <div className="flex gap-1">
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 bg-slate-50 font-normal">
                                                            {wp.contractType}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 bg-slate-50 font-normal">
                                                            {wp.renewalType}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex relative h-14">
                                                {/* Background Grid */}
                                                {months.map((_, i) => (
                                                    <div key={i} className="flex-1 border-r last:border-r-0" />
                                                ))}

                                                {/* Validity Bars */}
                                                {wp.validityPeriods.map((vp: ValidityPeriod) => {
                                                    const style = getPeriodStyle(vp.startDate, vp.endDate, months);
                                                    if (!style) return null;

                                                    return (
                                                        <TooltipProvider key={vp.id}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className={cn(
                                                                            "absolute top-3 h-8 rounded-md shadow-sm border transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-between px-3 overflow-hidden",
                                                                            vp.isPremium
                                                                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                                                                : "bg-emerald-100 border-emerald-300 text-emerald-900"
                                                                        )}
                                                                        style={style || {}}
                                                                        onClick={() => setSelectedPeriod({ ...vp, wpName: wp.name, clientName: client.name, renewalType: wp.renewalType, contractType: wp.contractType })}
                                                                    >
                                                                        <span className="text-[10px] font-bold truncate">
                                                                            {format(new Date(vp.startDate), "dd/MM")} - {format(new Date(vp.endDate), "dd/MM")}
                                                                        </span>
                                                                        {vp.isPremium && <Star className="w-3 h-3 text-amber-500 shrink-0" />}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="p-0 z-50 shadow-xl border-none">
                                                                    <div className="bg-white rounded-lg overflow-hidden border w-64 shadow-2xl">
                                                                        <div className={cn(
                                                                            "p-3 flex items-center justify-between",
                                                                            vp.isPremium ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                                                                        )}>
                                                                            <span className="font-bold text-xs uppercase text-white">{t("filters.details")}</span>
                                                                            {vp.isPremium && <Star className="w-4 h-4 fill-current text-white" />}
                                                                        </div>
                                                                        <div className="p-3 space-y-2 text-xs">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">{t("filters.contractedVolume")}:</span>
                                                                                <span className="font-bold">{vp.totalQuantity} {vp.scopeUnit || t("filters.hours")}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">{t("filters.unitRate")}:</span>
                                                                                <span className="font-bold">{vp.rate} €</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">{t("filters.end")}:</span>
                                                                                <span className="font-bold text-rose-600">{format(new Date(vp.endDate), "dd MMMM yyyy", { locale: es })}</span>
                                                                            </div>
                                                                            <div className="pt-1 border-t flex justify-center">
                                                                                <span className="text-[10px] text-slate-400 italic">{t("filters.clickForDetails")}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Legend / Info */}
            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 uppercase">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {t("filters.standardLabel")}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                    <Star className="w-3 h-3 text-amber-500" />
                    {t("filters.premiumLabel")}
                </div>
            </div>

            {/* Details Modal */}
            <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
                <DialogContent className="max-w-2xl border-t-8 border-t-malachite rounded-xl shadow-2xl bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-dark-green uppercase">
                            {t("filters.contractDetails")}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {selectedPeriod?.clientName} • {selectedPeriod?.wpName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("filters.validity")}</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-malachite" />
                                            <span className="text-sm font-semibold">{t("filters.start")}:</span>
                                        </div>
                                        <span className="text-sm">{selectedPeriod && format(new Date(selectedPeriod.startDate), "dd/MM/yyyy")}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-rose-500" />
                                            <span className="text-sm font-semibold">{t("filters.end")}:</span>
                                        </div>
                                        <span className="text-sm font-bold text-rose-600">{selectedPeriod && format(new Date(selectedPeriod.endDate), "dd/MM/yyyy")}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-semibold">{t("filters.status")}:</span>
                                        </div>
                                        {selectedPeriod && new Date(selectedPeriod.endDate) < new Date() ? (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> {t("filters.expired")}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 text-white">
                                                <CheckCircle2 className="w-3 h-3" /> {t("filters.active")}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t("filters.configuration")}</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{t("filters.contractType")}:</span>
                                        <Badge variant="outline" className="bg-white text-dark-green uppercase">{selectedPeriod?.contractType}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{t("filters.renewalType")}:</span>
                                        <Badge variant="outline" className="bg-white text-dark-green uppercase">{selectedPeriod?.renewalType === 'AUTO' ? t("filters.automation") : t("filters.onDemand")}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{t("filters.level")}:</span>
                                        {selectedPeriod?.isPremium ? (
                                            <span className="text-amber-600 font-bold flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-amber-500" /> PREMIUM
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 font-bold uppercase text-[10px]">{t("filters.standard")}</span>
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
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t("filters.economicConditions")}</h4>
                                <div className="space-y-4 relative z-10">
                                    <div>
                                        <span className="block text-xs text-slate-400 mb-1">{t("filters.contractedVolume")}</span>
                                        <span className="text-3xl font-bold tracking-tight text-white">
                                            {selectedPeriod?.totalQuantity} <span className="text-sm font-normal text-slate-400">{selectedPeriod?.scopeUnit || t("filters.hours")}</span>
                                        </span>
                                    </div>
                                    <div className="flex gap-6">
                                        <div>
                                            <span className="block text-xs text-slate-400 mb-1">{t("filters.unitRate")}</span>
                                            <span className="text-xl font-bold text-white">{selectedPeriod?.rate} €</span>
                                        </div>
                                        {selectedPeriod?.isPremium && (
                                            <div>
                                                <span className="block text-xs text-slate-400 mb-1">{t("filters.premiumPrice")}</span>
                                                <span className="text-xl font-bold text-amber-400">{selectedPeriod?.rate} €</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-3 border-t border-slate-700">
                                        <div className="flex justify-between text-xs mb-1 text-slate-400">
                                            <span>{t("filters.surplusMaintenance")}:</span>
                                            <span className="text-white font-medium uppercase font-bold">{selectedPeriod?.surplusStrategy || t("filters.billing")}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>{t("filters.regularization")}:</span>
                                            <span className="text-white font-medium uppercase font-bold">{selectedPeriod?.regularizationType || t("filters.quarterly")}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full bg-malachite hover:bg-jade text-white font-bold" onClick={() => setSelectedPeriod(null)}>
                                {t("filters.closeDetails")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

