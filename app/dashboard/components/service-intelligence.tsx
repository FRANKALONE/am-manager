"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceIntelligenceMetrics } from "@/app/actions/dashboard";
import { useTranslations } from "@/lib/use-translations";
import { Brain, TrendingUp, Users, Zap, Target, Lock } from "lucide-react";

export function ServiceIntelligence({
    wpId,
    selectedPeriodId,
    isPremium
}: {
    wpId: string,
    selectedPeriodId?: number,
    isPremium: boolean
}) {
    const { t } = useTranslations();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!wpId) return;
        setLoading(true);
        getServiceIntelligenceMetrics(wpId, selectedPeriodId).then(data => {
            setMetrics(data);
            setLoading(false);
        }).catch(err => {
            console.error("Error loading intelligence metrics:", err);
            setLoading(false);
        });
    }, [wpId, selectedPeriodId]);

    if (!isPremium) {
        return (
            <Card className="border-dashed border-2 bg-slate-50/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Premium Feature</span>
                </div>
                <CardContent className="flex flex-col items-center justify-center p-16 text-center">
                    <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-0">
                        <Lock className="w-10 h-10 text-slate-300" />
                    </div>
                    <CardTitle className="text-2xl mb-4 font-bold tracking-tight">{t('dashboard.intelligence.title')}</CardTitle>
                    <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                        {t('dashboard.intelligence.premiumOnly')}
                    </p>
                    <div className="flex gap-4 blur-[2px] opacity-40 select-none pointer-events-none scale-90">
                        <div className="w-32 h-24 bg-slate-200 rounded-xl" />
                        <div className="w-32 h-24 bg-slate-200 rounded-xl" />
                        <div className="w-32 h-24 bg-slate-200 rounded-xl" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-6">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-pulse"></div>
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-muted-foreground font-semibold animate-pulse">{t('common.loading')}</p>
            </div>
        );
    }

    if (!metrics || !metrics.slaTrend || metrics.slaTrend.length === 0) {
        return (
            <Card className="bg-slate-50/30 border-dashed">
                <CardContent className="p-16 text-center text-muted-foreground">
                    <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Brain className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-medium">{t('dashboard.intelligence.noData')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-2">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center">
                        <Brain className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('dashboard.intelligence.title')}</h2>
                        <p className="text-slate-500 font-medium">{t('dashboard.intelligence.subtitle')}</p>
                    </div>
                </div>
                {metrics.isPremium && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-widest leading-none">Insight Active</span>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
                {/* SLA Trend Chart (Simplified CSS Bars) */}
                <Card className="col-span-1 lg:col-span-4 shadow-xl shadow-slate-200/50 border-slate-100 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.slaTrend')}</CardTitle>
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="pt-8 pb-4">
                        <div className="h-[240px] w-full flex items-end gap-3 px-2">
                            {metrics.slaTrend.map((item: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div className="relative w-full bg-slate-50 rounded-xl flex flex-col justify-end h-[200px] transition-colors group-hover:bg-slate-100">
                                        <div
                                            className={`w-full relative transition-all duration-1000 delay-${i * 100} ease-out rounded-t-xl overflow-hidden ${item.percentage >= 95 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' :
                                                    item.percentage >= 80 ? 'bg-gradient-to-t from-amber-500 to-amber-300' :
                                                        'bg-gradient-to-t from-rose-600 to-rose-400'
                                                }`}
                                            style={{ height: `${item.percentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                                        </div>
                                        {/* Tooltip-like value */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-xl -translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-10">
                                            {item.percentage.toFixed(1)}% Compliance
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-primary transition-colors">{item.month}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Efficiency Stats Card */}
                <Card className="col-span-1 lg:col-span-2 shadow-xl shadow-slate-200/50 border-slate-100 overflow-hidden bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.efficiency')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-4">
                        <div className="flex items-center justify-between group">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.intelligence.timeToResolve')}</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-4xl font-black text-primary transition-transform group-hover:scale-110 origin-left duration-500">{metrics.efficiency.avgDays}</p>
                                    <span className="text-sm font-bold text-slate-400">{t('dashboard.intelligence.days')}</span>
                                </div>
                            </div>
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-100">
                                <Zap className="w-7 h-7 text-blue-600 animate-[pulse_3s_infinite]" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('dashboard.intelligence.compliance')}</span>
                                    <p className="text-sm font-bold text-emerald-600">SLA Health Score</p>
                                </div>
                                <span className="text-2xl font-black text-emerald-600">
                                    {(metrics.slaTrend[metrics.slaTrend.length - 1]?.percentage || 0).toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-lg"
                                    style={{ width: `${metrics.slaTrend[metrics.slaTrend.length - 1]?.percentage || 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Cerrados</p>
                                <p className="text-xl font-black text-slate-800">{metrics.efficiency.closedCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-100" />
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Pendientes</p>
                                <p className="text-xl font-black text-amber-500">{metrics.efficiency.openCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Demand Forecast with visual "Brain" background feel */}
                <Card className="col-span-1 lg:col-span-2 shadow-xl shadow-slate-200/50 border-slate-100 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.demandForecast')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative overflow-hidden group">
                            <div className="text-6xl font-black text-slate-900 mb-2 relative z-10 transition-transform group-hover:scale-125 duration-700">
                                {metrics.forecast.nextMonth}
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest relative z-10">{t('dashboard.intelligence.ticketsForecast')}</p>
                            <Target className="w-24 h-24 absolute -bottom-4 -right-4 text-slate-200/60 rotate-12 transition-transform duration-1000 group-hover:rotate-0 group-hover:scale-110" />
                        </div>

                        <div className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm transition-shadow hover:shadow-md">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confianza Predictiva</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-grow h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${metrics.forecast.confidence}%` }} />
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{metrics.forecast.confidence}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Composition Breakdown */}
                <Card className="col-span-1 lg:col-span-4 shadow-xl shadow-slate-200/50 border-slate-100">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.serviceComposition')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-5">
                                {metrics.composition.map((item: any, i: number) => {
                                    const total = metrics.efficiency.closedCount + metrics.efficiency.openCount;
                                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                                    return (
                                        <div key={i} className="space-y-2 group">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${item.name === 'Correctivo' ? 'bg-rose-500' :
                                                            item.name === 'Evolutivo' ? 'bg-blue-600' :
                                                                item.name === 'Consulta / Soporte' ? 'bg-amber-400' : 'bg-slate-400'
                                                        }`} />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400">{item.value} tickets ({pct.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden p-[1px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 delay-${i * 150} shadow-sm ${item.name === 'Correctivo' ? 'bg-rose-500' :
                                                            item.name === 'Evolutivo' ? 'bg-blue-600' :
                                                                item.name === 'Consulta / Soporte' ? 'bg-amber-400' : 'bg-slate-400'
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-col items-center justify-center p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 relative group overflow-hidden">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 relative z-10 transition-transform group-hover:scale-110 duration-500">
                                    <Users className="w-10 h-10 text-slate-300 group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-center text-sm font-semibold text-slate-500 italic relative z-10 leading-relaxed group-hover:text-slate-700">
                                    "{t('dashboard.intelligence.valueFocused')}"
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
