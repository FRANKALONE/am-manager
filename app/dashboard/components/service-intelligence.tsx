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

                {/* 2. System Stability Index (Stabilization Trend) */}
                <Card className="lg:col-span-8 shadow-xl border-slate-100 overflow-hidden">
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
                        <div className="space-y-12">
                            <div className="h-[220px] w-full overflow-x-auto pb-4">
                                <div className="h-[200px] min-w-full flex items-end gap-3 px-2 w-fit mx-auto">
                                    {(metrics.stabilityTrend || []).map((item: any, i: number) => (
                                        <div key={i} className="flex-1 min-w-[36px] flex flex-col items-center gap-3 group relative h-full">
                                            <div className="w-full flex-1 flex flex-col items-center justify-end gap-0.5 min-h-[140px]">
                                                {/* Corrective Part */}
                                                <div
                                                    className="w-full rounded-t-sm bg-rose-500/80 transition-all duration-700 hover:bg-rose-500 relative"
                                                    style={{ height: `${item.correctivePct}%` }}
                                                >
                                                    {item.correctivePct > 10 && (
                                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/40 rotate-90 whitespace-nowrap">FIX</span>
                                                    )}
                                                </div>
                                                {/* Stabilization / Others Part */}
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

                {/* 3. Risk Hotspots Radar */}
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

                {/* 4. Operational Noise & User Training */}
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

                {/* 5. Ingress vs Egress (Project Sustainability) */}
                <Card className="lg:col-span-6 shadow-xl border-slate-100">
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
                        <div className="h-[210px] w-full overflow-x-auto pb-4">
                            <div className="h-[180px] min-w-full flex items-end gap-2 px-4 w-fit mx-auto">
                                {(metrics.volumeTrend || []).map((v: any, i: number) => {
                                    const maxVal = Math.max(1, ...metrics.volumeTrend.map((mt: any) => mt.created || 0));
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

                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white p-2 rounded text-[10px] z-20 min-w-[80px] shadow-2xl">
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

                {/* 6. Strategic Simulation: De Soporte a Innovación */}
                <Card className="lg:col-span-12 shadow-2xl border-indigo-500/20 bg-gradient-to-br from-indigo-50/10 via-white to-indigo-50/20 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-indigo-600" />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Reinversión Estratégica: De Soporte a Innovación</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-10 pt-4">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Reducción de Ruido Operativo</p>
                                            <p className="text-xs text-slate-400 font-medium">Optimice procesos y formación para liberar capacidad.</p>
                                        </div>
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
                                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                        <span>Estado Actual</span>
                                        <span>Optimización Total</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ruido Detectado</p>
                                        <p className="text-3xl font-black text-slate-900">{noiseCount} <span className="text-xs font-bold text-slate-400">tickets/mes</span></p>
                                    </div>
                                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl space-y-2">
                                        <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest">Esfuerzo Unitario de Soporte</p>
                                        <p className="text-3xl font-black text-indigo-600">{avgConsultation} <span className="text-xs font-bold text-indigo-600/60">h/ticket</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-2xl opacity-5 group-hover:opacity-10 transition-opacity" />
                                <div className="relative bg-white border-2 border-slate-100 p-10 rounded-[3rem] text-center space-y-6 shadow-xl">
                                    <div className="w-24 h-24 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto mb-2 rotate-3 transition-transform group-hover:rotate-0">
                                        <TrendingUp className="w-12 h-12 text-indigo-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">CAPACIDAD LIBERADA PARA INNOVACIÓN</h5>
                                        <div className="flex flex-col items-center">
                                            <span className="text-7xl font-black text-indigo-900 tracking-tighter">+{capacitySaving.toFixed(0)}h</span>
                                            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">Impacto en Evolutivos</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                            <ArrowRight className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                            Estas horas pasarían de ser un <span className="font-bold text-indigo-700">coste operativo</span> a ser una <span className="font-bold text-indigo-700">inversión en el futuro</span> de sus sistemas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 7. Contract Sizing Forecast Tool */}
                <Card className="lg:col-span-12 shadow-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-50/10 via-white to-emerald-50/20 overflow-hidden relative">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Target className="w-5 h-5 text-emerald-600" />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Pronóstico de Dimensionamiento de Contrato</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-10 pt-4">
                        <div className="grid md:grid-cols-2 gap-16 items-start">
                            <div className="space-y-8">
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    Configure los volúmenes previstos para el próximo periodo. El sistema utilizará sus <span className="font-bold text-slate-700">costes reales de servicio</span> para calcular el dimensionamiento óptimo.
                                </p>

                                <div className="grid grid-cols-1 gap-6">
                                    {[
                                        { key: 'corrective', label: 'Tickets Correctivos', sub: 'Mantenimiento y Errores', icon: ShieldAlert, color: 'text-red-500', max: 200, unit: 'Tickets' },
                                        { key: 'consultation', label: 'Tickets de Consulta', sub: 'Soporte a Usuarios', icon: MessageSquareWarning, color: 'text-amber-500', max: 200, unit: 'Tickets' },
                                        { key: 'evolution', label: 'Horas de Evolutivos', sub: 'Nuevas Funcionalidades', icon: Lightbulb, color: 'text-indigo-500', max: 500, unit: 'Horas' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl bg-white border border-slate-100 shadow-sm ${item.color}`}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{item.label}</span>
                                                    <span className="text-xs font-bold text-slate-400">{item.unit} previstos: {forecastCounts[item.key as keyof typeof forecastCounts]}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={item.max}
                                                    value={forecastCounts[item.key as keyof typeof forecastCounts] as number}
                                                    onChange={(e) => setForecastCounts({ ...forecastCounts, [item.key]: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-600"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-5 h-5 text-emerald-600" />
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">Servicios IAAS / Base</p>
                                                <p className="text-[10px] text-slate-400">Infraestructura y Monitorización</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={forecastCounts.iaas}
                                            onChange={(e) => setForecastCounts({ ...forecastCounts, iaas: e.target.checked })}
                                            className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-900 rounded-[3rem] p-10 text-white space-y-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">PROYECCIÓN DE NECESIDAD MENSUAL</h5>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-black tracking-tighter">{projectedHours.toFixed(0)}</span>
                                        <span className="text-2xl font-black text-emerald-400">Horas</span>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-emerald-800">
                                    <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Desglose de inversión</p>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Soporte y Correctivo', hours: (forecastCounts.corrective * (metrics.avgHoursByType?.corrective || 4.5)) + (forecastCounts.consultation * (metrics.avgHoursByType?.consultation || 2.5)), color: 'bg-emerald-400' },
                                            { label: 'Evolutivos', hours: forecastCounts.evolution, color: 'bg-indigo-400' },
                                        ].filter(b => b.hours > 0).map((bar, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span>{bar.label}</span>
                                                    <span>{bar.hours.toFixed(1)}h</span>
                                                </div>
                                                <div className="h-2 bg-emerald-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${bar.color}`} style={{ width: `${(bar.hours / projectedHours) * 100}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button className="w-full py-4 bg-emerald-400 text-emerald-950 font-black rounded-2xl hover:bg-white transition-colors uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                        Solicitar Presupuesto Basado en Datos
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
