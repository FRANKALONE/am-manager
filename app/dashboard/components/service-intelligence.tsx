"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceIntelligenceMetrics } from "@/app/actions/dashboard";
import { useTranslations } from "@/lib/use-translations";
import {
    Brain,
    TrendingUp,
    Lock,
    Clock,
    AlertTriangle,
    Zap,
    Target,
    PieChart,
    Activity,
    ShieldAlert,
    MessageSquareWarning,
    UserX,
    Lightbulb,
    ChevronRight,
    ArrowRight,
    CalendarDays
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function ServiceIntelligence({
    wpId,
    selectedPeriodId,
    permissions
}: {
    wpId: string,
    selectedPeriodId?: number,
    permissions: Record<string, boolean>
}) {
    const { t } = useTranslations();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reductionPct, setReductionPct] = useState(10);
    const [range, setRange] = useState(selectedPeriodId?.toString() || 'current_period');

    // Contract Forecasting State
    const [forecastCounts, setForecastCounts] = useState({
        corrective: 0,
        consultation: 0,
        evolution: 0,
        iaas: false
    });

    useEffect(() => {
        if (!wpId) return;
        setLoading(true);
        getServiceIntelligenceMetrics(wpId, range).then(data => {
            setMetrics(data);
            setLoading(false);
        }).catch(err => {
            console.error("Error loading intelligence metrics:", err);
            setLoading(false);
        });
    }, [wpId, range]);

    if (!permissions.view_service_intelligence) {
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
                        {t('dashboard.intelligence.permissionRequired')}
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

    if (!metrics) {
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

    // Calculations for Value Shift simulation
    const noiseCount = (metrics.operationalNoise?.byComponent || []).reduce((sum: number, c: any) => sum + c.value, 0) ||
        (metrics.composition?.find((c: any) => c.name === 'Consulta / Soporte')?.value || 0);

    const avgConsultation = metrics.avgHoursByType?.consultation || 2.5;
    const capacitySaving = noiseCount * (reductionPct / 100) * avgConsultation;

    // Contract Forecasting Calculation
    const projectedHours = (
        (forecastCounts.corrective * (metrics.avgHoursByType?.corrective || 4.5)) +
        (forecastCounts.consultation * (metrics.avgHoursByType?.consultation || 2.5)) +
        (forecastCounts.evolution) + // Evolution is now raw hours
        (forecastCounts.iaas ? (metrics.avgHoursByType?.iaas || 40) : 0)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-2 pb-12">

            {/* 1. Header & Executive Summary */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="lg:w-1/3 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-dark-green rounded-2xl shadow-xl flex items-center justify-center">
                            <Brain className="w-10 h-10 text-malachite" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">{t('dashboard.intelligence.title')}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-malachite animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Enterprise Intelligence Active</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed px-1">
                        Información estratégica sobre la salud de sus sistemas, identificación de riesgos y oportunidades de optimización operativa.
                    </p>
                    <div className="pt-2">
                        <Select value={range} onValueChange={setRange}>
                            <SelectTrigger className="w-full bg-white shadow-sm border-slate-200 text-slate-700 font-bold h-12">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-dark-green" />
                                    <SelectValue placeholder="Seleccionar periodo" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="current_period" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.current_period')}</SelectItem>
                                <SelectItem value="previous_period" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.previous_period')}</SelectItem>
                                <SelectItem value="last_month" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.last_month')}</SelectItem>
                                <SelectItem value="last_quarter" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.last_quarter')}</SelectItem>
                                <SelectItem value="last_6m" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.last_6m')}</SelectItem>
                                <SelectItem value="last_12m" className="font-semibold text-slate-600 focus:bg-malachite/10">{t('dashboard.intelligence.periods.last_12m')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="lg:w-2/3 w-full">
                    <Card className="bg-gradient-to-br from-slate-900 to-blue-grey text-white border-none shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Lightbulb className="w-32 h-32" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-malachite" />
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-malachite">
                                    {t('dashboard.intelligence.executiveSummary')}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 pt-2">
                                {(metrics.recommendations || []).map((rec: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-xl border border-white/10 transition-colors hover:bg-white/10 group">
                                        <div className="w-8 h-8 rounded-lg bg-malachite/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <ChevronRight className="w-4 h-4 text-malachite group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed text-slate-200">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">

                {/* 1. Backlog Trends (Demanda vs Capacidad) - MOVED HERE */}
                <Card className="lg:col-span-12 shadow-xl border-slate-100 h-full">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.backlogTrend')}</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Equilibrio entre demanda entrante y capacidad de resolución.</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] w-full overflow-x-auto pb-64"> {/* pb-64 to avoid tooltip clipping */}
                            <div className="h-[180px] min-w-full flex items-end gap-2 px-4 w-fit mx-auto">
                                {(metrics.volumeTrend || []).map((v: any, i: number) => {
                                    const maxVal = Math.max(1, ...metrics.volumeTrend.map((mt: any) => Math.max(mt.created || 0, mt.resolved || 0)));
                                    return (
                                        <div key={i} className="flex-1 min-w-[32px] max-w-[60px] flex flex-col justify-end gap-2 group relative">
                                            <div className="flex gap-1 items-end h-[140px]">
                                                <div
                                                    className="flex-1 bg-prussian/20 rounded-t-sm hover:bg-prussian/40 transition-colors"
                                                    style={{ height: `${((v.created || 0) / maxVal) * 100}%` }}
                                                />
                                                <div
                                                    className="flex-1 bg-malachite/30 rounded-t-sm hover:bg-malachite/50 transition-colors"
                                                    style={{ height: `${((v.resolved || 0) / maxVal) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">{v.month}</span>

                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white p-2 rounded text-[10px] z-50 min-w-[80px] shadow-2xl">
                                                <div className="flex justify-between gap-2"><span>Entrada:</span> <b>{v.created}</b></div>
                                                <div className="flex justify-between gap-2"><span>Salida:</span> <b>{v.resolved}</b></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-center gap-8 mt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-prussian/20 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Demanda</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-malachite/30 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacidad</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. System Stability Index (Stabilization Trend) */}
                <Card className="lg:col-span-12 shadow-xl border-slate-100 overflow-hidden">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.stabilityIndex')}</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Evolución de la carga correctiva frente a la mejora continua.</p>
                            </div>
                            <Activity className="w-5 h-5 text-malachite" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-10 pb-6">
                        <div className="space-y-6">
                            <div className="h-[200px] w-full flex items-end gap-3 px-2 w-fit mx-auto justify-center">
                                {(metrics.stabilityTrend || []).map((item: any, i: number) => (
                                    <div key={i} className="flex-1 max-w-[80px] flex flex-col items-center gap-3 group relative h-full">
                                        <div className="w-full flex-1 flex flex-col items-center justify-end gap-0.5 min-h-[140px]">
                                            <div
                                                className="w-full rounded-t-sm bg-rose-500/80 transition-all duration-700 hover:bg-rose-500 relative"
                                                style={{ height: `${item.correctivePct}%` }}
                                            >
                                                {item.correctivePct > 10 && (
                                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/40 rotate-90 whitespace-nowrap">FIX</span>
                                                )}
                                            </div>
                                            <div
                                                className="w-full rounded-b-sm bg-malachite/20 transition-all duration-700 hover:bg-malachite/30"
                                                style={{ height: `${100 - item.correctivePct}%` }}
                                            />
                                        </div>
                                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded shadow-xl z-20 whitespace-nowrap">
                                            Correctivo: <b>{item.correctivePct.toFixed(1)}%</b>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center h-4">{item.month}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center gap-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-rose-500/80" />
                                    <span className="text-xs font-bold text-slate-600">Incidencias (Correctivo)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-sm bg-malachite/20" />
                                    <span className="text-xs font-bold text-slate-600">Valor Añadido (Evolutivo/Soporte)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Backlog Aging - MOVED UP */}
                <Card className="lg:col-span-12 shadow-xl border-slate-100">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">Análisis de Backlog (Aging)</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Tickets abiertos distribuidos por su mes de creación original.</p>
                            </div>
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] w-full overflow-x-auto pb-48"> {/* pb-48 to avoid tooltip clipping */}
                            <div className="h-[210px] min-w-full flex items-end gap-3 px-4 w-fit mx-auto">
                                {(metrics.backlogTrend || []).map((b: any, i: number) => {
                                    const maxTotal = Math.max(1, ...metrics.backlogTrend.map((bt: any) => bt.total || 0));
                                    return (
                                        <div key={i} className="flex-1 min-w-[45px] max-w-[80px] flex flex-col justify-end gap-2 group relative">
                                            <div className="w-full flex flex-col-reverse h-[160px] rounded-t-lg overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                                {(b.byCreationMonth || []).map((cm: any, j: number) => (
                                                    <div
                                                        key={j}
                                                        className={`w-full transition-all group-hover:brightness-110`}
                                                        style={{
                                                            height: `${(cm.value / maxTotal) * 100}%`,
                                                            backgroundColor: j === 0 ? '#008580' :
                                                                j === 1 ? '#28B463' :
                                                                    j === 2 ? '#58D68D' :
                                                                        j === 3 ? '#ABEBC6' : '#D1F2EB'
                                                        }}
                                                    />
                                                ))}
                                                {b.total === 0 && <div className="h-full w-full bg-slate-50/50 border-t border-dashed border-slate-100" />}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 text-center uppercase tracking-tighter">{b.month}</span>

                                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white p-3 rounded-xl text-[10px] z-50 min-w-[140px] shadow-2xl space-y-2">
                                                <div className="border-b border-white/10 pb-1 mb-1 font-bold text-malachite">Snapshot: {b.month}</div>
                                                <div className="flex justify-between font-black"><span>Total Backlog:</span> <span>{b.total} tks</span></div>
                                                <div className="space-y-1 pt-1">
                                                    {(b.byCreationMonth || []).slice(0, 5).map((cm: any, j: number) => (
                                                        <div key={j} className="flex justify-between text-[9px] text-white/70 italic">
                                                            <span>De {cm.name}:</span> <span>{cm.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4 px-8 py-2 bg-slate-50/50 rounded-2xl mx-auto w-fit">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Creados en:</span>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#008580' }} /><span className="text-[9px] font-bold text-slate-600">Mes Actual</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28B463' }} /><span className="text-[9px] font-bold text-slate-600">Mes -1</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#58D68D' }} /><span className="text-[9px] font-bold text-slate-600">Mes -2</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ABEBC6' }} /><span className="text-[9px] font-bold text-slate-600">Mes -3</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#D1F2EB' }} /><span className="text-[9px] font-bold text-slate-600">Anteriores</span></div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Corrective by Priority - MOVED BELOW STABILITY */}
                <Card className="lg:col-span-8 shadow-xl border-slate-100">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">Calidad y Prioridades (Correctivo)</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Volumen mensual desglosado por criticidad.</p>
                            </div>
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[250px] w-full overflow-x-auto pb-48"> {/* pb-48 for tooltips */}
                            <div className="h-[180px] min-w-full flex items-end gap-4 px-4 w-fit mx-auto">
                                {(metrics.correctiveByPriority || []).map((cp: any, i: number) => {
                                    const maxT = Math.max(1, ...metrics.correctiveByPriority.map((item: any) =>
                                        (item.Baja || 0) + (item.Media || 0) + (item.Alta || 0) + (item.Crítica || 0)
                                    ));
                                    return (
                                        <div key={i} className="flex-1 min-w-[50px] max-w-[100px] flex flex-col justify-end gap-2 group relative">
                                            <div className="w-full h-[140px] flex flex-col-reverse rounded-t-md overflow-hidden bg-slate-50">
                                                <div className="w-full bg-slate-300 transition-all" style={{ height: `${((cp.Baja || 0) / maxT) * 100}%` }} />
                                                <div className="w-full bg-blue-400 transition-all" style={{ height: `${((cp.Media || 0) / maxT) * 100}%` }} />
                                                <div className="w-full bg-orange-400 transition-all" style={{ height: `${((cp.Alta || 0) / maxT) * 100}%` }} />
                                                <div className="w-full bg-rose-600 transition-all" style={{ height: `${((cp.Crítica || 0) / maxT) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">{cp.month}</span>

                                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white p-3 rounded-xl text-[10px] z-50 min-w-[120px] shadow-2xl">
                                                <div className="flex justify-between border-b border-white/10 pb-1 mb-1"><span>Crítica:</span> <b>{cp.Crítica}</b></div>
                                                <div className="flex justify-between"><span>Alta:</span> <b>{cp.Alta}</b></div>
                                                <div className="flex justify-between"><span>Media:</span> <b>{cp.Media}</b></div>
                                                <div className="flex justify-between"><span>Baja:</span> <b>{cp.Baja}</b></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-6">
                            {['Crítica', 'Alta', 'Media', 'Baja'].map((p, i) => (
                                <div key={p} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-rose-600' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-blue-400' : 'bg-slate-300'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 5. Risk Hotspots Radar */}
                <Card className="lg:col-span-4 shadow-xl border-slate-100 bg-white overflow-hidden">
                    <CardHeader className="bg-rose-50/50 border-b border-rose-100">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg font-bold text-rose-900">{t('dashboard.intelligence.riskRadar')}</CardTitle>
                            <ShieldAlert className="w-5 h-5 text-rose-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            {(metrics.riskRadar || []).length > 0 ? (
                                metrics.riskRadar.map((r: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{r.name}</span>
                                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{r.riskScore.toFixed(0)}% Criticality</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                            <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${r.riskScore}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 uppercase tracking-widest">
                                            <span>Issues: {r.totalCount}</span>
                                            <span className="text-rose-400">Critical: {r.criticalCount}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-12 h-12 bg-malachite/10 rounded-full flex items-center justify-center mx-auto">
                                        <Activity className="w-6 h-6 text-malachite" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No se detectan módulos con riesgo crítico acumulado.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 6. Operational Noise & User Training */}
                <Card className="lg:col-span-6 shadow-xl border-slate-100">
                    <CardHeader className="bg-blue-50/30 border-b border-blue-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">{t('dashboard.intelligence.operationalNoise')}</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">identificación de áreas con alta demanda de soporte táctico.</p>
                            </div>
                            <MessageSquareWarning className="w-5 h-5 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Top 5 Módulos (Soporte)</h4>
                                {(metrics.operationalNoise.byComponent || []).map((c: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group cursor-default">
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase truncate w-32">{c.name}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-400"
                                                    style={{ width: `${(c.value / (metrics.operationalNoise.byComponent[0]?.value || 1)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 w-4 text-right">{c.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Top 5 Usuarios Relevantes</h4>
                                {(metrics.operationalNoise.byReporter || []).map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group cursor-default">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200 uppercase">
                                                {r.name.substring(0, 2)}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate w-24">{r.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{r.value} <span className="text-[9px] text-slate-400 font-normal">tks</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 7. Component & Type Distribution - MOVED NEXT TO NOISE */}
                <Card className="lg:col-span-6 shadow-xl border-slate-100 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">Distribución por Componente y Tipo</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Radiografía del servicio por módulo operativo.</p>
                            </div>
                            <PieChart className="w-5 h-5 text-dark-green" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            {(metrics.componentTypeMatrix || []).slice(0, 4).map((comp: any, i: number) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <h5 className="text-[9px] font-black text-slate-700 uppercase tracking-widest truncate mb-2">{comp.component}</h5>
                                    <div className="flex gap-1 h-1 rounded-full overflow-hidden">
                                        {comp.data.map((d: any, j: number) => (
                                            <div
                                                key={j}
                                                className="h-full"
                                                style={{
                                                    width: `${(d.value / comp.total) * 100}%`,
                                                    backgroundColor: d.type.includes('Incidencia') ? '#E11D48' :
                                                        d.type.includes('Consulta') ? '#3B82F6' :
                                                            d.type.includes('Evolutivo') ? '#059669' : '#94A3B8'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-2 flex justify-between">
                                        <span className="text-lg font-black text-slate-900">{comp.total}</span>
                                        <div className="flex gap-1">
                                            {comp.data.map((d: any, j: number) => (
                                                <span key={j} className="text-[7px] font-bold text-slate-400">
                                                    {d.type.includes('Incidencia') ? 'IC' : d.type.includes('Consulta') ? 'CO' : 'EV'}:{d.value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-slate-900 rounded-2xl text-white">
                            <p className="text-[10px] leading-relaxed">
                                <span className="text-malachite font-bold">{metrics.componentTypeMatrix?.[0]?.component}</span> es el módulo con mayor actividad global.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 8. SLAs and Average Times */}
                <Card className="lg:col-span-12 shadow-xl border-slate-100">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">Eficiencia Operativa</CardTitle>
                                <p className="text-xs text-slate-500 font-medium">Tiempos medios de respuesta y resolución.</p>
                            </div>
                            <Target className="w-5 h-5 text-indigo-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="h-[150px] w-full flex items-end gap-2 px-2 border-b border-slate-100 pb-2 justify-center">
                                    {(metrics.elapsedTimeTrend || []).map((et: any, i: number) => {
                                        const maxVal = Math.max(1, ...metrics.elapsedTimeTrend.map((item: any) => Math.max(item.avgResolution || 0, item.avgResponse || 0)));
                                        return (
                                            <div key={i} className="flex-1 max-w-[40px] flex flex-col justify-end group relative h-full">
                                                <div className="flex items-end justify-center gap-1 h-full">
                                                    <div
                                                        className="w-2 bg-indigo-500 rounded-t-full transition-all hover:brightness-125"
                                                        style={{ height: `${(et.avgResponse / maxVal) * 100}%` }}
                                                    />
                                                    <div
                                                        className="w-2 bg-indigo-900 rounded-t-full transition-all hover:brightness-125"
                                                        style={{ height: `${(et.avgResolution / maxVal) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] py-1 px-2 rounded shadow-xl z-20 whitespace-nowrap">
                                                    Res: <b>{et.avgResolution.toFixed(1)}h</b> | Resp: <b>{et.avgResponse.toFixed(1)}h</b>
                                                </div>
                                                <span className="text-[8px] text-slate-400 mt-2 font-bold">{et.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center gap-10">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Respuesta</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-900" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolución</span></div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media de Respuesta</p>
                                        <p className="text-4xl font-black text-indigo-600">
                                            {(metrics.elapsedTimeTrend?.[metrics.elapsedTimeTrend.length - 1]?.avgResponse || 0).toFixed(1)}h
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media de Resolución</p>
                                        <p className="text-4xl font-black text-indigo-900">
                                            {(metrics.elapsedTimeTrend?.[metrics.elapsedTimeTrend.length - 1]?.avgResolution || 0).toFixed(1)}h
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                                    <p className="text-xs font-medium text-indigo-900 leading-relaxed italic">
                                        "El tiempo medio de resolución se ha mantenido estable en los últimos 3 meses, cumpliendo con los estándares de servicio establecidos."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 9. Continuous Improvement & Simulation - REMAINING BOTTOM */}
                <Card className="lg:col-span-12 shadow-xl border-slate-100 overflow-hidden relative">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-malachite/10 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-dark-green" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Mejora Continua y Optimización del Sistema</CardTitle>
                                    <p className="text-xs text-slate-500 font-medium">Análisis de patrones redundantes y oportunidades de eficiencia operativa.</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid lg:grid-cols-3 divide-x divide-slate-100">
                            {/* Repetitive Issues List */}
                            <div className="lg:col-span-2 p-8 space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Patrones Repetitivos Detectados
                                </h4>

                                <div className="space-y-4">
                                    {metrics.optimizationOpportunities?.length > 0 ? (
                                        metrics.optimizationOpportunities.map((op: any, i: number) => (
                                            <div key={i} className="group bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 transition-all hover:shadow-md">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-900 group-hover:text-dark-green transition-colors">{op.summary}</span>
                                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase">{op.component}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 font-medium">Se han registrado <span className="text-dark-green font-bold">{op.count} incidencias</span> de este tipo en el periodo seleccionado.</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-lg font-black text-slate-900 leading-none">-{op.totalHours.toFixed(1)}h</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Impacto Real</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No se han detectado patrones críticos.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Impact Summary Side */}
                            <div className="p-8 bg-slate-50/30 flex flex-col justify-between">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Potencial de Optimización</h4>
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ahorro Estimado</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                                    {metrics.optimizationOpportunities?.reduce((sum: number, op: any) => sum + op.totalHours, 0).toFixed(0)}h
                                                </span>
                                                <span className="text-xs font-black text-dark-green uppercase">/ periodo</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 10. Strategic Simulation */}
                <Card className="lg:col-span-12 shadow-2xl border-indigo-500/20 bg-gradient-to-br from-indigo-50/10 via-white to-indigo-50/20 overflow-hidden relative group">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-indigo-600" />
                            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Reinversión Estratégica</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-10 pt-4">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-sm font-bold text-slate-700">Reducción de Ruido Operativo</p>
                                        <span className="text-3xl font-black text-indigo-600">-{reductionPct}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={reductionPct}
                                        onChange={(e) => setReductionPct(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                                <div className="relative bg-white border-2 border-slate-100 p-10 rounded-[3rem] text-center shadow-xl">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">CAPACIDAD LIBERADA PARA INNOVACIÓN</h5>
                                    <span className="text-7xl font-black text-indigo-900 tracking-tighter">+{capacitySaving.toFixed(0)}h</span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    Al reducir el ruido operativo mediante mejores procesos y formación, liberamos capacidad técnica que puede ser utilizada para acelerar el desarrollo de nuevas funcionalidades sin aumentar el presupuesto.
                                </p>
                                <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                                    <p className="text-xs font-bold text-malachite uppercase tracking-widest mb-2">Efecto Palanca</p>
                                    <p className="text-sm leading-relaxed opacity-80">
                                        Esta capacidad liberada equivale a ejecutar {(capacitySaving / 40).toFixed(1)} evolutivos adicionales de tamaño medio por periodo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 11. Forecast Tool */}
                <Card className="lg:col-span-12 shadow-2xl border-emerald-500/20 bg-emerald-50/10">
                    <CardHeader>
                        <Target className="w-6 h-6 text-emerald-600 mb-2" />
                        <CardTitle className="text-xl font-black text-slate-800">Dimensionamiento de Próximo Periodo</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid lg:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                {[
                                    { key: 'corrective', label: 'Tickets Correctivos', unit: 'Tkts', max: 200 },
                                    { key: 'consultation', label: 'Tickets de Consulta', unit: 'Tkts', max: 200 },
                                    { key: 'evolution', label: 'Horas de Evolutivos', unit: 'Horas', max: 500 }
                                ].map((item) => (
                                    <div key={item.key} className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-black text-slate-700 uppercase">{item.label}</span>
                                            <span className="text-xs font-bold text-emerald-600">{forecastCounts[item.key as keyof typeof forecastCounts]} {item.unit}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={item.max}
                                            value={forecastCounts[item.key as keyof typeof forecastCounts] as number}
                                            onChange={(e) => setForecastCounts({ ...forecastCounts, [item.key]: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="bg-emerald-900 rounded-[3rem] p-10 text-white flex flex-col justify-center items-center">
                                <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">ESTIMACIÓN DE BOLSA RECOMENDADA</h5>
                                <span className="text-8xl font-black tracking-tighter">{projectedHours.toFixed(0)}</span>
                                <span className="text-2xl font-black text-emerald-400">Horas Totales</span>
                                <button className="mt-8 px-8 py-4 bg-emerald-400 text-emerald-950 font-black rounded-2xl hover:bg-white transition-colors uppercase tracking-widest text-xs">
                                    Generar Solicitud de Contratación
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
