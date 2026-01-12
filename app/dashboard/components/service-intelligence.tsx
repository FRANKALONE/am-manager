"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceIntelligenceMetrics } from "@/app/actions/dashboard";
import { useTranslations } from "@/lib/use-translations";
import { Brain, TrendingUp, Users, Zap, Target, Lock, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity } from "lucide-react";

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
    const [reductionPct, setReductionPct] = useState(10);

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

    // Calculations for What-if
    const currentAvgDays = metrics.efficiency.avgDays;
    const projectedDays = currentAvgDays * (1 - reductionPct / 100);
    const capacitySaving = metrics.efficiency.closedCount * (currentAvgDays - projectedDays);

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
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-widest leading-none">Intelligence Active</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">

                {/* 1. SLA Performance (Resolution vs Response) */}
                <Card className="lg:col-span-8 shadow-xl shadow-slate-200/50 border-slate-100 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.slaTrend')}</CardTitle>
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="pt-8 pb-4">
                        <div className="space-y-12">
                            {/* Resolution SLA */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Cumplimiento de Resolución</h4>
                                    <span className="text-sm font-bold text-primary">Target: 95%</span>
                                </div>
                                <div className="h-[120px] w-full flex items-end gap-2 px-2">
                                    {metrics.slaTrend.map((item: any, i: number) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-1000 ease-out ${item.resolutionPct >= 95 ? 'bg-emerald-500 group-hover:bg-emerald-600' :
                                                        item.resolutionPct >= 80 ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-rose-500 group-hover:bg-rose-600'
                                                    }`}
                                                style={{ height: `${item.resolutionPct}%` }}
                                            />
                                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-20">
                                                {item.resolutionPct.toFixed(1)}%
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center">{item.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Response SLA */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Cumplimiento de Primera Respuesta</h4>
                                    <span className="text-sm font-bold text-blue-500">Target: 98%</span>
                                </div>
                                <div className="h-[120px] w-full flex items-end gap-2 px-2">
                                    {metrics.slaTrend.map((item: any, i: number) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-1000 ease-out bg-blue-400/80 group-hover:bg-blue-500`}
                                                style={{ height: `${item.responsePct}%` }}
                                            />
                                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-20">
                                                {item.responsePct.toFixed(1)}%
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate w-full text-center">{item.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Efficiency by Priority */}
                <Card className="lg:col-span-4 shadow-xl shadow-slate-200/50 border-slate-100 bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.efficiency')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">MTTR Global</p>
                                <p className="text-3xl font-black text-primary">{metrics.efficiency.avgDays} <span className="text-sm text-slate-400">días</span></p>
                            </div>
                            <Zap className="w-8 h-8 text-blue-500" />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">MTTR por Prioridad</h4>
                            {metrics.efficiency.byPriority.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className={`w-20 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.priority === 'Crítica' ? 'bg-rose-100 text-rose-700' :
                                            p.priority === 'Alta' ? 'bg-amber-100 text-amber-700' :
                                                p.priority === 'Media' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                        }`}>{p.priority}</span>
                                    <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-300 rounded-full" style={{ width: `${(p.avgDays / 10) * 100}%` }} />
                                    </div>
                                    <span className="text-xs font-black text-slate-700 w-12 text-right">{p.avgDays} <span className="text-[9px] text-slate-400 font-normal">h</span></span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-center">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Resueltos</p>
                                <p className="text-lg font-black text-emerald-600">{metrics.efficiency.closedCount}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Backlog</p>
                                <p className="text-lg font-black text-amber-500">{metrics.efficiency.openCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Ingress vs Egress Trend */}
                <Card className="lg:col-span-12 shadow-xl shadow-slate-200/50 border-slate-100">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.backlogTrend')}</CardTitle>
                        <Activity className="w-5 h-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[200px] w-full flex items-end gap-6 px-4">
                            {metrics.volumeTrend.map((v: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                                    <div className="flex gap-1 items-end h-[160px]">
                                        <div
                                            className="flex-1 bg-blue-400/30 rounded-t-md hover:bg-blue-400/50 transition-colors"
                                            style={{ height: `${(v.created / Math.max(...metrics.volumeTrend.map((mt: any) => mt.created))) * 100}%` }}
                                        />
                                        <div
                                            className="flex-1 bg-emerald-400/30 rounded-t-md hover:bg-emerald-400/50 transition-colors"
                                            style={{ height: `${(v.resolved / Math.max(...metrics.volumeTrend.map((mt: any) => mt.created))) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 text-center uppercase">{v.month}</span>

                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white p-2 rounded text-[10px] z-20 min-w-[80px]">
                                        <div className="flex justify-between gap-2"><span>In:</span> <b>{v.created}</b></div>
                                        <div className="flex justify-between gap-2"><span>Out:</span> <b>{v.resolved}</b></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center gap-8 mt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-400/30 rounded" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.intelligence.created')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-400/30 rounded" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.intelligence.resolved')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Service & Component Composition */}
                <Card className="lg:col-span-4 shadow-xl shadow-slate-200/50 border-slate-100 h-full">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.serviceComposition')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {metrics.composition.map((item: any, i: number) => {
                                const total = metrics.composition.reduce((sum: number, c: any) => sum + c.value, 0);
                                const pct = (item.value / total) * 100;
                                return (
                                    <div key={i} className="group">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-slate-600 truncate">{item.name}</span>
                                            <span className="text-[10px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${item.name === 'Correctivo' ? 'bg-rose-500' :
                                                    item.name === 'Evolutivo' ? 'bg-blue-600' :
                                                        item.name === 'Consulta / Soporte' ? 'bg-amber-400' : 'bg-slate-400'
                                                }`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-6 border-t border-slate-100 overflow-hidden">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{t('dashboard.intelligence.componentComposition')}</h4>
                            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {metrics.componentComposition.slice(0, 5).map((c: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 truncate w-32">{c.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-24 bg-slate-50 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-200" style={{ width: `${(c.value / metrics.componentComposition[0].value) * 100}%` }} />
                                            </div>
                                            <span className="font-bold w-4">{c.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Workload Heatmap */}
                <Card className="lg:col-span-8 shadow-xl shadow-slate-200/50 border-slate-100">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.density')}</CardTitle>
                        <Clock className="w-5 h-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-25 gap-1">
                            {/* Time labels row */}
                            <div className="col-span-1" />
                            {[0, 4, 8, 12, 16, 20].map(h => (
                                <div key={h} className="col-span-4 text-[8px] font-bold text-slate-400 text-center">{h}:00</div>
                            ))}

                            {/* Data rows */}
                            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, dIdx) => (
                                <>
                                    <div key={day} className="col-span-1 text-[8px] font-black text-slate-400 uppercase flex items-center">{t(`dashboard.intelligence.${day}`).substring(0, 1)}</div>
                                    {metrics.density[dIdx].map((val: number, hIdx: number) => {
                                        const maxVal = Math.max(...metrics.density.flat());
                                        const intensity = maxVal > 0 ? val / maxVal : 0;
                                        return (
                                            <div
                                                key={`${day}-${hIdx}`}
                                                className="aspect-square rounded-[1px] transition-transform hover:scale-125 hover:z-10 cursor-pointer group relative"
                                                style={{
                                                    backgroundColor: intensity === 0 ? '#f8fafc' :
                                                        `rgba(59, 130, 246, ${Math.max(0.1, intensity)})`,
                                                    border: val > 0 ? '1px solid rgba(59,130,246,0.1)' : 'none'
                                                }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white p-1 rounded text-[8px] z-30 pointer-events-none whitespace-nowrap">
                                                    {val} tickets @ {hIdx}:00
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2 text-[9px] font-bold text-slate-400">
                            <span>Menos</span>
                            <div className="flex gap-1">
                                {[0.1, 0.4, 0.7, 1].map(o => <div key={o} className="w-2.5 h-2.5 rounded-[1px]" style={{ background: `rgba(59, 130, 246, ${o})` }} />)}
                            </div>
                            <span>Más actividad</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 6. What-if Simulation Card */}
                <Card className="lg:col-span-12 shadow-2xl shadow-primary/10 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-blue-50/30 overflow-hidden relative">
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.whatIf')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-2">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-sm font-semibold text-slate-700">{t('dashboard.intelligence.impactResolution')}</p>
                                        <span className="text-2xl font-black text-primary">-{reductionPct}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        value={reductionPct}
                                        onChange={(e) => setReductionPct(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Actual</span>
                                        <span>Ambitious (-50%)</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-white border border-primary/10 rounded-2xl shadow-sm space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estimación MTTR futuro</p>
                                    <p className="text-4xl font-black text-slate-900">{projectedDays.toFixed(1)} <span className="text-sm text-slate-400">días/ticket</span></p>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary rounded-[2.5rem] blur-xl opacity-10 group-hover:opacity-20 transition-opacity" />
                                <div className="relative bg-white border-2 border-primary/20 p-8 rounded-[2.5rem] text-center space-y-4">
                                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                                        <TrendingUp className="w-10 h-10 text-primary" />
                                    </div>
                                    <h5 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('dashboard.intelligence.projectedSavings')}</h5>
                                    <div className="flex flex-col">
                                        <span className="text-5xl font-black text-primary tracking-tighter">+{capacitySaving.toFixed(1)}</span>
                                        <span className="text-sm font-black text-primary">Horas de capacidad liberada</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed px-6">
                                        Optimizar este porcentaje permitiría absorber hasta <span className="font-bold text-slate-600">{(capacitySaving / 8).toFixed(1)} tickets</span> adicionales al mes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Add these to global CSS or local style block if needed for the grid 25
// .grid-cols-25 { grid-template-columns: repeat(25, minmax(0, 1fr)); }
