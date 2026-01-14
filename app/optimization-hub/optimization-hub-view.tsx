"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Brain, Sparkles, TrendingUp, ArrowRight, Info, Download,
    AlertTriangle, FileText, Calendar, Lightbulb, History,
    Briefcase, Target, LayoutDashboard, ShieldAlert, ChevronRight,
    Search
} from "lucide-react";
import { getDashboardClients, getClientOptimizationMetrics } from "@/app/actions/dashboard";
import { generateProposalAction } from "@/app/actions/proposals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
    clients: any[];
    permissions: Record<string, boolean>;
};

export default function OptimizationHubView({ clients: initialClients, permissions }: Props) {
    const [clients, setClients] = useState<any[]>(initialClients || []);
    const [selectedClient, setSelectedClient] = useState<string>("");
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showJustify, setShowJustify] = useState<{ show: boolean, data: any }>({ show: false, data: null });

    useEffect(() => {
        if (!clients || clients.length === 0) {
            const loadClients = async () => {
                const data = await getDashboardClients();
                setClients(data);
                if (data.length > 0) {
                    setSelectedClient(data[0].id);
                }
            };
            loadClients();
        } else if (clients.length > 0 && !selectedClient) {
            setSelectedClient(clients[0].id);
        }
    }, [clients]);

    useEffect(() => {
        const loadMetrics = async () => {
            if (!selectedClient) return;
            setLoading(true);
            try {
                const data = await getClientOptimizationMetrics(selectedClient);
                setMetrics(data);
            } catch (error) {
                console.error("Error loading metrics:", error);
                toast.error("Error al cargar los datos del cliente");
            } finally {
                setLoading(false);
            }
        };
        loadMetrics();
    }, [selectedClient]);

    const handleGenerateProposal = async (type: string, insightData: any) => {
        if (generating) return;
        setGenerating(true);
        toast.info("Generando propuesta profesional...");
        try {
            const result = await generateProposalAction(selectedClient, type, insightData);
            if (result.success && result.data) {
                const link = document.createElement("a");
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.data}`;
                link.download = result.filename || "Propuesta.docx";
                link.click();
                toast.success("Propuesta generada correctamente");
            } else {
                toast.error("Error al generar el documento: " + result.error);
            }
        } catch (error) {
            toast.error("Error inesperado al generar la propuesta");
        } finally {
            setGenerating(false);
        }
    };

    const stats = metrics?.stats || { totalResolved: 0, totalHours: 0, isSufficient: true };
    const roiHours = Math.round(stats.totalHours * 0.15); // Estimated 15% noise reduction
    const roiMoney = roiHours * 65; // Avg blended rate

    if (!clients || clients.length === 0) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No se han encontrado clientes asignados.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8 pb-20">
            {/* Header with Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-malachite/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <div className="space-y-2 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-dark-green rounded-2xl shadow-lg">
                            <Sparkles className="w-6 h-6 text-malachite" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Optimization Hub</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultoría Proactiva & Evolución de Sistemas</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto relative">
                    <div className="space-y-1.5 min-w-[300px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente para Análisis Estratégico</label>
                        <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger className="bg-slate-50 border-none h-12 font-bold shadow-inner text-slate-900">
                                <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Data Sufficiency Warning */}
            {metrics && !stats.isSufficient && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-3xl">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-1">¡Aviso de Calidad de Datos!</AlertTitle>
                    <AlertDescription className="text-sm font-medium">
                        Este cliente tiene un volumen histórico bajo ({stats.totalResolved} tickets / {stats.totalHours}h). Los análisis de ROI y previsiones de SAP Evolution podrían no ser totalmente precisos debido a la falta de masa crítica de datos.
                    </AlertDescription>
                </Alert>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-40 gap-4">
                    <div className="w-12 h-12 border-4 border-malachite/20 border-t-malachite rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Analizando histórico del cliente...</p>
                </div>
            ) : metrics ? (
                <div className="grid gap-8 lg:grid-cols-12">

                    {/* SAP Evolution Engine - The "WOW" Factor for Managers */}
                    <Card className="lg:col-span-12 shadow-2xl border-none bg-gradient-to-br from-slate-900 via-blue-grey to-slate-900 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                            <Briefcase className="w-64 h-64 text-malachite" />
                        </div>
                        <CardHeader className="pb-2 border-b border-white/5">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-malachite animate-pulse" />
                                        <CardTitle className="text-xl font-black tracking-tight text-white uppercase">SAP Evolution Engine v1.0</CardTitle>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">Recomendaciones estratégicas basadas en el ruido operativo del cliente.</p>
                                </div>
                                <Badge className="bg-malachite/20 text-malachite border-malachite/30 font-black">MANAGER ADVISOR ACTIVE</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-8">
                            <div className="grid md:grid-cols-3 gap-8">
                                {(metrics.sapEvolution || []).map((evo: any, i: number) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 hover:bg-white/10 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 rounded-2xl bg-malachite/20 flex items-center justify-center">
                                                <TrendingUp className="w-6 h-6 text-malachite" />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black text-white leading-none">+{evo.hours}h</div>
                                                <div className="text-[10px] font-bold text-malachite uppercase tracking-widest">Ruido/Mes</div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-lg font-black text-white">{evo.name}</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                                Detectado alto volumen de incidencias ({evo.count}) relacionadas con procesos de este área.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {evo.subModules.map((sm: string, j: number) => (
                                                <Badge key={j} variant="outline" className="text-[10px] font-black border-white/20 text-slate-300 px-3">{sm}</Badge>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-white/5 mt-4 space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-200">
                                                    <span className="text-indigo-400 font-bold tracking-widest uppercase text-[9px] block mb-1">Oportunidad Consultoría</span>
                                                    Proponer proyecto de optimización o implementación de {evo.subModules[0] || evo.name} para reducir costes operativos un {(evo.hours / (metrics.stats?.totalHours || 1) * 100).toFixed(1)}%.
                                                </p>
                                            </div>
                                            <button
                                                disabled={generating}
                                                onClick={() => handleGenerateProposal(`Evolutivo ${evo.name}`, evo)}
                                                className="w-full py-3 bg-white text-slate-900 font-black rounded-xl hover:bg-malachite disabled:opacity-50 transition-colors uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                            >
                                                {generating ? "Generando..." : "Generar Propuesta"}
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Optimization Opportunities Panel */}
                    <Card className="lg:col-span-8 shadow-xl border-slate-100 overflow-hidden relative group">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <History className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Análisis de Patrones de Incidencia</CardTitle>
                                        <p className="text-xs text-slate-500 font-medium">Top 5 puntos de dolor identificados para este cliente.</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-6">
                                {metrics.optimizationOpportunities?.length > 0 ? (
                                    metrics.optimizationOpportunities.map((op: any, i: number) => (
                                        <div key={i} className="group bg-white hover:bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-all hover:shadow-lg relative overflow-hidden">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black uppercase px-2 py-0.5">{op.component}</Badge>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ref: {op.count} tks</span>
                                                    </div>
                                                    <h4 className="text-base font-black text-slate-900">{op.summary}</h4>
                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl">
                                                        Este patrón recurrente está generando una carga de <span className="text-indigo-600 font-bold">{op.totalHours.toFixed(1)}h</span> en el periodo analizado. Resolverlo liberaría capacidad para evolutivos estratégicos.
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0 p-4 bg-slate-900 rounded-2xl text-white shadow-xl min-w-[100px]">
                                                    <div className="text-2xl font-black leading-none">{op.totalHours.toFixed(0)}h</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Coste Real</div>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <button
                                                    disabled={generating}
                                                    onClick={() => handleGenerateProposal(`Optimización ${op.summary}`, op)}
                                                    className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    <Download className="w-4 h-4" /> Generar Propuesta
                                                </button>
                                                <button
                                                    onClick={() => setShowJustify({ show: true, data: op })}
                                                    className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase hover:translate-x-1 transition-transform"
                                                >
                                                    Ver Justificación <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                            <Brain className="w-8 h-8 opacity-10" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No se detectan patrones críticos repetitivos.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manager Advisor: Business Case Side */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="shadow-xl border-none bg-indigo-600 text-white overflow-hidden relative rounded-[2rem]">
                            <div className="absolute top-0 right-0 p-8 opacity-20">
                                <Target className="w-24 h-24" />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                    <LayoutDashboard className="w-5 h-5" />
                                    Potencial de Venta
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-sm font-medium leading-relaxed opacity-90">
                                    Basado en los datos analizados, este cliente tiene un <span className="font-black text-white underline decoration-white/30 decoration-4">{(metrics.optimizationOpportunities?.reduce((sum: number, op: any) => sum + op.totalHours, 0) / (metrics.stats?.totalHours || 1) * 100).toFixed(1)}%</span> de ruido operativo optimizable.
                                </p>

                                <div className="bg-white/10 p-5 rounded-2xl space-y-2 border border-white/20 shadow-inner">
                                    <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ahorro Anual Proyectado</div>
                                    <div className="text-4xl font-black text-white tracking-tighter">
                                        {(metrics.optimizationOpportunities?.reduce((sum: number, op: any) => sum + op.totalHours, 0) * 1.5).toFixed(0)}h
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h5 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Argumentos de Valor</h5>
                                    <ul className="space-y-3">
                                        {[
                                            'Reducción drástica de micro-incidentes',
                                            'Liberación de presupuesto para innovación',
                                            'Mayor estabilidad en periodos críticos',
                                            'Optimización de la UX para el usuario final'
                                        ].map((arg, i) => (
                                            <li key={i} className="flex gap-3 items-start group">
                                                <div className="w-5 h-5 rounded-full bg-malachite flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                                                    <ChevronRight className="w-3 h-3 text-dark-green" />
                                                </div>
                                                <span className="text-[11px] font-bold text-white/90">{arg}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xl border-slate-100 bg-white p-8 rounded-[2rem] space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-malachite/10 flex items-center justify-center">
                                    <ShieldAlert className="w-5 h-5 text-dark-green" />
                                </div>
                                <h4 className="text-lg font-black text-slate-800">Alerta de Riesgo</h4>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                El módulo <span className="text-rose-500 font-bold">'{metrics.riskRadar?.[0]?.name || 'Base'}'</span> presenta una tendencia creciente en criticidad. Es vital incluirlo en la próxima revisión trimestral con el cliente.
                            </p>
                            <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-black uppercase tracking-tighter">Acción Recomendada: Auditoría Técnica</Badge>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="py-40 text-center">
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm animate-pulse">Iniciando Dashboard de Consultoría...</p>
                </div>
            )}

            {/* Justification Modal */}
            <Dialog open={showJustify.show} onOpenChange={(open) => setShowJustify({ ...showJustify, show: open })}>
                <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-malachite/20 rounded-lg">
                                    <Brain className="w-5 h-5 text-malachite" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black border-white/20 text-slate-300 uppercase tracking-widest">{showJustify.data?.component || 'General'}</Badge>
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight">{showJustify.data?.summary || showJustify.data?.name}</DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium">Análisis detallado de causa raíz y propuesta de optimización.</DialogDescription>
                        </DialogHeader>
                    </div>

                    <ScrollArea className="max-h-[60vh] p-8">
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Justificación Técnica</h4>
                                </div>
                                <p className="text-sm font-medium leading-relaxed text-slate-600 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    {showJustify.data?.justification}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Evidencias (Tickets Recientes)</h4>
                                </div>
                                <div className="grid gap-3">
                                    {showJustify.data?.sampleTickets?.map((t: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">{t.key}</div>
                                                <span className="text-xs font-bold text-slate-700">{t.summary}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(t.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">Impacto Proyectado</h4>
                                </div>
                                <p className="text-xs font-bold text-indigo-900/70 leading-relaxed">
                                    La resolución definitiva de este patrón no solo reduciría en un <span className="text-indigo-600 font-extrabold">20-30%</span> el ruido operativo de este módulo, sino que mejoraría la percepción del servicio por parte de los usuarios clave que reportan estas incidencias periódicamente.
                                </p>
                            </section>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                        <Button
                            variant="outline"
                            onClick={() => setShowJustify({ show: false, data: null })}
                            className="rounded-xl font-bold uppercase tracking-widest text-[10px]"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => handleGenerateProposal(showJustify.data?.summary || showJustify.data?.name, showJustify.data)}
                            disabled={generating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 px-6"
                        >
                            {generating ? "Generando..." : <><Download className="w-4 h-4" /> Descargar Propuesta .DOCX</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
