"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDashboardWPs, getDashboardMetrics, getTicketConsumptionReport } from "@/app/actions/dashboard";
import { syncWorkPackage } from "@/app/actions/sync";
import { deleteSelectedRegularizations, markRegularizationsAsReviewed } from "@/app/actions/regularizations";
import { DuplicateConsumptionsModal } from "./duplicate-consumptions-modal";
import { Activity, BarChart3, PieChart, Clock, AlertCircle, RefreshCcw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableMonthlyRow } from "./expandable-monthly-row";
import { TicketConsumptionReport } from "./ticket-consumption-report";
import { ReviewRequestModal } from "./review-request-modal";
import { ServiceIntelligence } from "./service-intelligence";
import { useTranslations } from "@/lib/use-translations";
import { toast } from "sonner";
import { formatDate } from "@/lib/date-utils";

// Simple Progress Component
function ProgressBar({ value, max = 100, className }: { value: number, max?: number, className?: string }) {
    const p = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={`h-4 w-full bg-secondary rounded-full overflow-hidden ${className}`}>
            <div className="h-full bg-primary transition-all duration-500 ease-in-out" style={{ width: `${p}%` }} />
        </div>
    );
}

export function DashboardView({
    clients,
    permissions,
    userId,
    initialClientId = "",
    initialWpId = "",
    readOnly = false,
    isAdmin = false,
    isPremium = false
}: {
    clients: { id: string, name: string }[],
    permissions: Record<string, boolean>,
    userId: string,
    initialClientId?: string,
    initialWpId?: string,
    readOnly?: boolean,
    isAdmin?: boolean,
    isPremium?: boolean
}) {
    const { t, locale } = useTranslations();
    const [selectedClient, setSelectedClient] = useState<string>(initialClientId);
    const [wps, setWps] = useState<any[]>([]);
    const [selectedWp, setSelectedWp] = useState<string>(initialWpId);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(undefined);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);

    // Review Request states
    const [selectedWorklogs, setSelectedWorklogs] = useState<any[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    // Date range filter states
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [startMonth, setStartMonth] = useState<number>(0);
    const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
    const [endMonth, setEndMonth] = useState<number>(11);
    const [endYear, setEndYear] = useState<number>(new Date().getFullYear());

    // Tab view state
    const [activeView, setActiveView] = useState<'monthly' | 'tickets' | 'intelligence'>('monthly');
    const [ticketReport, setTicketReport] = useState<any>(null);
    const [loadingTicketReport, setLoadingTicketReport] = useState(false);
    const isInitialMount = useRef(true);

    // Month names for filter dropdown
    const monthNamesShort = locale === 'es'
        ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Clear selection when WP or Period changes
    useEffect(() => {
        setSelectedWorklogs([]);
    }, [selectedWp, selectedPeriodId]);

    const handleWorklogSelect = (worklog: any, isSelected: boolean) => {
        if (isSelected) {
            setSelectedWorklogs(prev => [...prev, worklog]);
        } else {
            setSelectedWorklogs(prev => prev.filter(w => w.id !== worklog.id));
        }
    };

    // Load WPs when Client changes
    useEffect(() => {
        if (!selectedClient) {
            setWps([]);
            return;
        }
        getDashboardWPs(selectedClient).then(data => {
            setWps(data);
            // Only auto-reset if not initialized with an ID
            if (data.length > 0 && !initialWpId) {
                setSelectedWp("");
                setMetrics(null);
            }
        });
    }, [selectedClient, initialWpId]);

    // Load Metrics when WP changes
    useEffect(() => {
        if (!selectedWp) return;
        setLoading(true);
        setUseCustomRange(false);
        setActiveView('monthly');
        isInitialMount.current = true;

        getDashboardMetrics(selectedWp).then(data => {
            setMetrics(data);
            setLoading(false);

            if (data?.validityPeriods && data.validityPeriods.length > 0) {
                const currentPeriod = data.validityPeriods.find((p: any) => p.isCurrent) || data.validityPeriods[0];
                setSelectedPeriodId(currentPeriod.id);

                const start = new Date(currentPeriod.startDate);
                const end = new Date(currentPeriod.endDate);
                setStartMonth(start.getMonth());
                setStartYear(start.getFullYear());
                setEndMonth(end.getMonth());
                setEndYear(end.getFullYear());
            }
        }).catch(err => {
            console.error("Failed to load metrics:", err);
            setLoading(false);
        });
    }, [selectedWp]);

    const handleSync = async () => {
        if (!selectedWp) return;
        setSyncing(true);
        try {
            const syncResult = await syncWorkPackage(selectedWp, true);

            if (syncResult && syncResult.error) {
                toast.error(`Error: ${syncResult.error}`);
            } else {
                toast.success(t('common.success'));
                if (syncResult?.duplicateConsumptions && syncResult.duplicateConsumptions.length > 0) {
                    setDuplicates(syncResult.duplicateConsumptions);
                    setShowDuplicatesModal(true);
                }
                const data = await getDashboardMetrics(selectedWp, selectedPeriodId);
                setMetrics(data);
            }
        } catch (err) {
            console.error("Sync failed:", err);
        } finally {
            setSyncing(false);
        }
    };

    const handlePeriodChange = async (newPeriodId: number) => {
        setSelectedPeriodId(newPeriodId);
        setLoading(true);
        setUseCustomRange(false);
        setTicketReport(null);

        try {
            const data = await getDashboardMetrics(selectedWp, newPeriodId);
            setMetrics(data);

            if (data?.validityPeriods && data.validityPeriods.length > 0) {
                const selectedPeriod = data.validityPeriods.find((p: any) => p.id === newPeriodId);
                if (selectedPeriod) {
                    const start = new Date(selectedPeriod.startDate);
                    const end = new Date(selectedPeriod.endDate);
                    setStartMonth(start.getMonth());
                    setStartYear(start.getFullYear());
                    setEndMonth(end.getMonth());
                    setEndYear(end.getFullYear());
                }
            }
        } catch (err) {
            console.error("Failed to load metrics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeView === 'tickets' && selectedWp && !ticketReport) {
            (async () => {
                setLoadingTicketReport(true);
                const data = await getTicketConsumptionReport(selectedWp, selectedPeriodId);
                setTicketReport(data);
                setLoadingTicketReport(false);
            })();
        }
    }, [activeView, selectedWp, selectedPeriodId]);

    useEffect(() => {
        setTicketReport(null);
    }, [selectedWp, selectedPeriodId]);

    const handleDeleteDuplicates = async (ids: number[]) => {
        setLoading(true);
        const result = await deleteSelectedRegularizations(ids);
        if (result.success) {
            if (selectedWp) {
                const data = await getDashboardMetrics(selectedWp, selectedPeriodId);
                setMetrics(data);
            }
        }
        setLoading(false);
    };

    const handleKeepDuplicates = async (ids: number[]) => {
        await markRegularizationsAsReviewed(ids);
    };

    const handleCloseDuplicatesModal = () => {
        setShowDuplicatesModal(false);
        setDuplicates([]);
    };

    const formatNumber = (num: number, tickets: boolean = false) => {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: tickets ? 0 : 2,
            maximumFractionDigits: tickets ? 0 : 2
        }).format(num);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-between bg-card p-6 rounded-xl border shadow-sm">
                {!readOnly ? (
                    <div className="flex flex-col md:flex-row gap-4 flex-grow">
                        <div className="space-y-2 w-full md:w-1/3">
                            <label className="text-sm font-medium">{t('dashboard.client')}</label>
                            <Select onValueChange={setSelectedClient} value={selectedClient}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('dashboard.selectClient')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 w-full md:w-1/3">
                            <label className="text-sm font-medium">{t('dashboard.wpLabel')}</label>
                            <Select onValueChange={setSelectedWp} value={selectedWp} disabled={!selectedClient || wps.length === 0}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('dashboard.selectWp')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {wps.map(wp => <SelectItem key={wp.id} value={wp.id}>{wp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow" />
                )}

                {selectedWp && (
                    <div className="flex flex-col items-end gap-2">
                        {metrics?.lastSyncedAt && (
                            <span className="text-[10px] text-muted-foreground italic">
                                {t('dashboard.lastSync')}: {formatDate(metrics.lastSyncedAt)}
                            </span>
                        )}
                        <Button
                            onClick={handleSync}
                            disabled={syncing || loading}
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? t('dashboard.syncing') : t('dashboard.syncNow')}
                        </Button>
                    </div>
                )}
            </div>

            {(loading || syncing) && (
                <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-in fade-in">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground font-medium text-center">
                        {syncing
                            ? `${t('dashboard.syncing')} ${wps.find(wp => wp.id === selectedWp)?.contractType?.toUpperCase() === 'EVENTOS' ? 'JIRA' : 'Tempo'}...`
                            : t('dashboard.loadingMetrics')
                        }
                    </p>
                </div>
            )}

            {metrics && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.contracted')}</CardTitle>
                                <PieChart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatNumber(metrics.billedAmount, metrics.scopeUnit === 'TICKETS')} / {formatNumber(metrics.totalScope, metrics.scopeUnit === 'TICKETS')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.billedPercentage.toFixed(1)}% {t('dashboard.billedOf')} <span className="font-semibold">{formatNumber(metrics.totalScope, metrics.scopeUnit === 'TICKETS')} {metrics.scopeUnit}</span>
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.consumed')}</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatNumber(metrics.totalConsumed, metrics.scopeUnit === 'TICKETS')} <span className="text-xs font-normal text-muted-foreground">{metrics.scopeUnit}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {(Math.floor(metrics.percentage * 10) / 10).toFixed(1)}% {t('dashboard.total')}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.available')}</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${metrics.remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatNumber(metrics.remaining, metrics.scopeUnit === 'TICKETS')} <span className="text-xs font-normal text-muted-foreground">{metrics.scopeUnit}</span>
                                </div>
                            </CardContent>
                        </Card>
                        {!metrics.isEventos && metrics.nextRegularization && (
                            <Card className="border-orange-200 bg-orange-50/50">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-orange-900">{t('dashboard.nextRegularization')}</CardTitle>
                                    <AlertCircle className="h-4 w-4 text-orange-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-900">
                                        {formatNumber(metrics.nextRegularization.hours)} <span className="text-xs font-normal text-muted-foreground">{metrics.scopeUnit}</span>
                                    </div>
                                    {permissions.view_costs && (
                                        <p className="text-xs text-orange-700 font-medium">
                                            {metrics.nextRegularization.amount.toFixed(2)}€
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDate(metrics.nextRegularization.date, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        ({metrics.nextRegularization.type})
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {!metrics.isEventos && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('dashboard.consumptionProgress')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProgressBar value={metrics.percentage} className="h-6" />
                                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2 border-b">
                        <button
                            onClick={() => setActiveView('monthly')}
                            className={`px-4 py-2 font-medium text-sm transition-colors ${activeView === 'monthly'
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t('dashboard.monthlyEvolution')}
                        </button>
                        {!metrics.isEventos && (
                            <button
                                onClick={() => setActiveView('tickets')}
                                className={`px-4 py-2 font-medium text-sm transition-colors ${activeView === 'tickets'
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t('dashboard.consumptionByTicket')}
                            </button>
                        )}
                        {permissions.view_service_intelligence && (
                            <button
                                onClick={() => setActiveView('intelligence')}
                                className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${activeView === 'intelligence'
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Brain className={`w-4 h-4 ${isPremium ? 'text-primary' : 'text-slate-400'}`} />
                                {t('dashboard.intelligence.title')}
                            </button>
                        )}
                    </div>

                    {activeView === 'monthly' && (
                        <div className="grid gap-4 md:grid-cols-1">
                            <Card className="col-span-1 border-t-4 border-t-primary">
                                <CardHeader>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <CardTitle>{t('dashboard.detalleMensual')}</CardTitle>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {metrics.validityPeriods && metrics.validityPeriods.length > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-medium text-muted-foreground">{t('dashboard.period')}:</label>
                                                    <Select
                                                        value={selectedPeriodId?.toString() || metrics.selectedPeriodId?.toString()}
                                                        onValueChange={(value) => handlePeriodChange(parseInt(value))}
                                                    >
                                                        <SelectTrigger className="w-[280px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {metrics.validityPeriods.map((period: any) => (
                                                                <SelectItem key={period.id} value={period.id.toString()}>
                                                                    {period.label} {period.isCurrent && `(${t('dashboard.current')})`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 border-l pl-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={useCustomRange}
                                                        onChange={(e) => setUseCustomRange(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                    <span className="text-xs font-medium text-muted-foreground">{t('dashboard.filterByDates')}</span>
                                                </label>

                                                {useCustomRange && (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs font-medium text-muted-foreground">{t('dashboard.from')}:</label>
                                                            <select
                                                                value={startMonth}
                                                                onChange={(e) => setStartMonth(parseInt(e.target.value))}
                                                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                                            >
                                                                {monthNamesShort.map((m, i) => (
                                                                    <option key={i} value={i}>{m}</option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                value={startYear}
                                                                onChange={(e) => setStartYear(parseInt(e.target.value))}
                                                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                                            >
                                                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs font-medium text-muted-foreground">{t('dashboard.to')}:</label>
                                                            <select
                                                                value={endMonth}
                                                                onChange={(e) => setEndMonth(parseInt(e.target.value))}
                                                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                                            >
                                                                {monthNamesShort.map((m, i) => (
                                                                    <option key={i} value={i}>{m}</option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                value={endYear}
                                                                onChange={(e) => setEndYear(parseInt(e.target.value))}
                                                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                                            >
                                                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                                                    <option key={year} value={year}>{year}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                                {t('dashboard.calculatedOnContract')}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr className="border-b">
                                                    <th className="h-10 px-4 text-left font-medium">{t('dashboard.month')}</th>
                                                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">{t('dashboard.contracted')}</th>
                                                    <th className="h-10 px-4 text-right font-medium">{t('dashboard.consumed')}</th>
                                                    <th className="h-10 px-4 text-right font-medium">{t('dashboard.difference')}</th>
                                                    {permissions.view_costs && (
                                                        <th className="h-10 px-4 text-right font-medium text-blue-600">{t('dashboard.regularization')}</th>
                                                    )}
                                                    {!metrics.isEventos && (
                                                        <th className="h-10 px-4 text-right font-medium">{t('dashboard.accumulated')}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let filteredMonths = metrics.monthlyEvolution;

                                                    if (useCustomRange) {
                                                        filteredMonths = metrics.monthlyEvolution.filter((m: any) => {
                                                            const [monthName, year] = m.month.split(' ');
                                                            const monthIndex = monthNamesShort.indexOf(monthName);
                                                            const monthYear = parseInt(year);

                                                            const monthDate = new Date(monthYear, monthIndex, 1);
                                                            const startDate = new Date(startYear, startMonth, 1);
                                                            const endDate = new Date(endYear, endMonth, 1);

                                                            return monthDate >= startDate && monthDate <= endDate;
                                                        });
                                                    }

                                                    return filteredMonths.map((m: any, idx: number) => (
                                                        <ExpandableMonthlyRow
                                                            key={m.month}
                                                            month={m}
                                                            wpId={selectedWp}
                                                            idx={idx}
                                                            scopeUnit={metrics.scopeUnit}
                                                            isEventos={metrics.isEventos || false}
                                                            permissions={permissions}
                                                            isPremium={isPremium}
                                                            isAdmin={isAdmin}
                                                            selectedWorklogs={selectedWorklogs}
                                                            onWorklogSelect={handleWorklogSelect}
                                                            onRequestReview={() => setIsReviewModalOpen(true)}
                                                        />
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <ReviewRequestModal
                        isOpen={isReviewModalOpen}
                        onClose={() => setIsReviewModalOpen(false)}
                        selectedWorklogs={selectedWorklogs}
                        wpId={selectedWp}
                        userId={userId}
                        onSuccess={() => {
                            setSelectedWorklogs([]);
                        }}
                    />

                    {activeView === 'tickets' && !metrics.isEventos && (
                        <div className="mt-4">
                            {loadingTicketReport ? (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <p className="text-muted-foreground">{t('dashboard.loadingTicketReport')}</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <TicketConsumptionReport
                                    data={ticketReport}
                                    validityPeriods={metrics?.validityPeriods}
                                    selectedPeriodId={selectedPeriodId}
                                    onPeriodChange={handlePeriodChange}
                                    isAdmin={isAdmin}
                                />
                            )}
                        </div>
                    )}

                    {activeView === 'intelligence' && (
                        <div className="mt-4">
                            <ServiceIntelligence
                                wpId={selectedWp}
                                selectedPeriodId={selectedPeriodId}
                                isPremium={isPremium}
                            />
                        </div>
                    )}
                </div>
            )}

            {!metrics && selectedClient && !selectedWp && (
                <div className="text-center p-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p>{t('dashboard.selectWpMessage')}</p>
                </div>
            )}

            <DuplicateConsumptionsModal
                open={showDuplicatesModal}
                duplicates={duplicates}
                onDelete={handleDeleteDuplicates}
                onKeep={handleKeepDuplicates}
                onClose={handleCloseDuplicatesModal}
            />
        </div>
    );
}
