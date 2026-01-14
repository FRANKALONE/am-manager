"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Sparkles,
    TrendingUp,
    ArrowRight,
    Info,
    Download,
    FileDown,
    AlertTriangle,
    FileText,
    Calendar,
    Lightbulb,
    History,
    Briefcase,
    Target,
    LayoutDashboard,
    ShieldAlert,
    ChevronRight,
    Activity,
    Zap,
    Clock,
    CheckCircle2,
    Send,
    Brain
} from "lucide-react";
import { getDashboardClients, getClientOptimizationMetrics } from "@/app/actions/dashboard";
import { generateProposalAction, generateAnalysisRequestAction } from "@/app/actions/proposals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

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
    const [requestingAnalysis, setRequestingAnalysis] = useState(false);
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

    const handleDownloadProposal = async (type: string, insightData: any) => {
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

    const handleRequestAnalysis = async (type: string, data: any) => {
        if (requestingAnalysis) return;
        setRequestingAnalysis(true);
        toast.info("Generando solicitud de análisis para consultoría...");
        try {
            const result = await generateAnalysisRequestAction(selectedClient, type, data);
            if (result.success && result.data) {
                const link = document.createElement('a');
                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${result.data}`;
                link.download = result.filename || "Solicitud_Analisis.docx";
                link.click();
                toast.success("Solicitud de análisis generada. Compártela con tu consultor SAP.");
            } else {
                toast.error("Error al generar solicitud: " + result.error);
            }
        } catch (error) {
            toast.error("Error inesperado al solicitar análisis");
        } finally {
            setRequestingAnalysis(false);
        }
    };

    const stats = metrics?.stats || { totalResolved: 0, totalHours: 0, isSufficient: true };

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
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <div className="space-y-2 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-900 rounded-2xl shadow-lg">
                            <Sparkles className="w-6 h-6 text-indigo-100" />
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
                        Este cliente tiene un volumen histórico bajo ({stats.totalResolved} tickets / {stats.totalHours}h). Los análisis de ROI y previsiones de SAP Evolution podrían no ser totalmente precisos.
                    </AlertDescription>
                </Alert>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
                </div>
            ) : metrics ? (
                <div className="space-y-12">
                    {/* KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-white border-slate-100 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium tracking-tight">Esfuerzo Analizado</p>
                                        <p className="text-2xl font-black text-slate-900">{stats.totalHours}h</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-slate-100 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium tracking-tight">Tickets Procesados</p>
                                        <p className="text-2xl font-black text-slate-900">{stats.totalResolved}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white border-slate-100 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                        <Lightbulb className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium tracking-tight">Oportunidades</p>
                                        <p className="text-2xl font-black text-slate-900">{metrics.optimizationOpportunities.length + metrics.sapEvolution.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-indigo-950 text-white border-none shadow-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-800 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Potencial Ahorro</p>
                                        <p className="text-2xl font-black">~{Math.round(stats.totalHours * 1.5).toFixed(0)}h/año</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 1: Optimization Opportunities */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Activity className="w-6 h-6 text-amber-500" />
                            <h2 className="text-2xl font-black text-slate-900">Reducción de Ruido Operativo</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {metrics.optimizationOpportunities.map((op: any, i: number) => (
                                <Card key={i} className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-all rounded-3xl">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg font-black text-slate-800 leading-tight pr-4">
                                                {op.summary}
                                            </CardTitle>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">{op.component}</Badge>
                                        </div>
                                        <CardDescription className="pt-2 font-bold text-amber-900">
                                            Carga detectada: {op.totalHours.toFixed(1)}h en {op.count} tickets.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-500 italic leading-relaxed">{op.justification}</p>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start text-[10px] font-black uppercase tracking-widest border-slate-100 hover:bg-slate-50"
                                            onClick={() => setShowJustify({ show: true, data: op })}
                                        >
                                            <Info className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                            Ver Justificación y Evidencias
                                        </Button>
                                        <div className="flex gap-2 w-full">
                                            <Button
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"
                                                onClick={() => handleDownloadProposal(op.summary, op)}
                                                disabled={generating}
                                            >
                                                <FileDown className="w-4 h-4 mr-2" />
                                                Propuesta
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="flex-1 font-black text-[10px] uppercase tracking-widest rounded-xl"
                                                onClick={() => handleRequestAnalysis(op.summary, op)}
                                                disabled={requestingAnalysis}
                                            >
                                                <Send className="w-4 h-4 mr-2" />
                                                Análisis
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: SAP Evolution Strategy */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Zap className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-2xl font-black text-slate-900">Evolución Estratégica SAP</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {metrics.sapEvolution.map((evo: any, i: number) => (
                                <Card key={i} className="bg-slate-50 border-none shadow-md rounded-[2rem] hover:shadow-xl transition-all">
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2 bg-indigo-100 rounded-xl">
                                                <Target className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-indigo-900">{evo.hours}h</div>
                                                <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Ruido/Periodo</div>
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-black text-slate-800">{evo.name}</CardTitle>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {evo.subModules.map((sm: string) => (
                                                <Badge key={sm} variant="secondary" className="bg-white text-[9px] border-slate-100 text-slate-500 font-bold">{sm}</Badge>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{evo.justification}</p>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-indigo-600 hover:bg-indigo-50 font-bold text-[10px] uppercase"
                                            onClick={() => setShowJustify({ show: true, data: evo })}
                                        >
                                            Ver Justificación
                                        </Button>
                                        <div className="flex flex-col gap-2 w-full">
                                            <Button
                                                className="w-full bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl"
                                                onClick={() => handleDownloadProposal(evo.name, evo)}
                                                disabled={generating}
                                            >
                                                <FileDown className="w-4 h-4 mr-2" />
                                                Descargar Propuesta
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="w-full font-black text-[10px] uppercase tracking-widest rounded-xl"
                                                onClick={() => handleRequestAnalysis(evo.name, evo)}
                                                disabled={requestingAnalysis}
                                            >
                                                <Send className="w-4 h-4 mr-2" />
                                                Solicitar Análisis
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Justification Modal */}
            <Dialog open={showJustify.show} onOpenChange={(open) => setShowJustify({ ...showJustify, show: open })}>
                <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-slate-900 p-8 text-white">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <Brain className="w-5 h-5 text-indigo-400" />
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black border-white/20 text-indigo-300 uppercase tracking-widest">
                                    {showJustify.data?.component || 'General'}
                                </Badge>
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight">
                                {showJustify.data?.summary || showJustify.data?.name}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium">
                                Justificación analítica del Manager Advisor
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <ScrollArea className="max-h-[60vh] p-8">
                        <div className="space-y-8 text-slate-600">
                            <section className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Análisis</h4>
                                <p className="text-sm font-medium leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                                    {showJustify.data?.justification}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidencias Detectadas</h4>
                                <div className="grid gap-2">
                                    {showJustify.data?.sampleTickets?.map((t: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{t.key}</div>
                                                <span className="text-xs font-bold text-slate-700">{t.summary}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400">
                                                {t.date}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowJustify({ show: false, data: null })} className="rounded-xl font-bold uppercase text-[10px]">
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => handleDownloadProposal(showJustify.data?.summary || showJustify.data?.name, showJustify.data)}
                            disabled={generating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] gap-2 px-6 shadow-lg shadow-indigo-100"
                        >
                            {generating ? "Generando..." : "Descargar Propuesta .DOCX"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
