"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, RefreshCcw, DollarSign, Calendar, Clock, TrendingUp, Info, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    getPendingCierres,
    processCierre,
    processBatchCierres,
    getClosureReportData,
    markReportAsSent,
    type CierreCandidate,
    type EventosStatus
} from "@/app/actions/cierres";
import { syncWorkPackage } from "@/app/actions/sync";
import { EvolutivosBillingPanel } from "./evolutivos-billing-panel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, ExternalLink, Download } from "lucide-react";

const MONTHS_LABELS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function CierresView() {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [candidates, setCandidates] = useState<CierreCandidate[]>([]);
    const [processed, setProcessed] = useState<CierreCandidate[]>([]);
    const [eventosMonitor, setEventosMonitor] = useState<EventosStatus[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncingWp, setSyncingWp] = useState<string | null>(null);
    const [processingWp, setProcessingWp] = useState<string | null>(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

    // Modal states
    const [processingModal, setProcessingModal] = useState<{
        isOpen: boolean;
        candidate: CierreCandidate | null;
        note: string;
        isRevenueRecognized: boolean;
        isBilled: boolean;
    }>({
        isOpen: false,
        candidate: null,
        note: "",
        isRevenueRecognized: false,
        isBilled: true
    });

    const [draftModal, setDraftModal] = useState<{
        isOpen: boolean;
        candidate: CierreCandidate | null;
        subject: string;
        body: string;
    }>({
        isOpen: false,
        candidate: null,
        subject: "",
        body: ""
    });

    // Filtros de UI
    const [searchTerm, setSearchTerm] = useState("");
    const [filterFrequency, setFilterFrequency] = useState("all");
    const [filterDueOnly, setFilterDueOnly] = useState(false);
    const [filterBalance, setFilterBalance] = useState<"all" | "positive" | "negative">("negative");

    const loadData = async () => {
        console.log(`[CIERRES] Refreshing data for ${month}/${year}...`);
        setLoading(true);
        try {
            const data = await getPendingCierres(month, year);
            console.log("[CIERRES] Data received:", data);
            setCandidates(data.candidates || []);
            setProcessed(data.processed || []);
            setEventosMonitor(data.eventosMonitor || []);
            setSelectedIds([]);
        } catch (error: any) {
            console.error("[CIERRES] Error loading data:", error);
            alert("Error al cargar candidatos: " + (error.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [month, year]);

    const downloadReport = async (candidate: CierreCandidate) => {
        setDownloadingReport(candidate.wpId);
        try {
            console.log("Generating report for WP:", candidate.wpId);
            const data = await getClosureReportData(candidate.wpId, month, year);
            const doc = new jsPDF();

            // Logo and Company Name
            try {
                doc.addImage("/logo-am.png", 'PNG', 14, 10, 22, 13);
            } catch (e) {
                doc.setFontSize(14);
                doc.setTextColor(0, 59, 40);
                doc.text("ALTIM AMA", 14, 20);
            }

            // Header Title
            doc.setFontSize(16);
            doc.setTextColor(0, 59, 40);
            const title = "JUSTIFICANTE DE CONSUMO Y REGULARIZACIÓN";
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, 200 - titleWidth - 14, 20);

            doc.setDrawColor(24, 212, 80);
            doc.line(14, 30, 196, 30);

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 14, 38);

            // Contact / Service Info Section
            doc.setFillColor(245, 247, 250);
            doc.rect(14, 45, 182, 35, 'F');

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("SERVICIO DE MANTENIMIENTO", 20, 55);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Cliente: ${data.clientName}`, 20, 62);
            doc.text(`Work Package: ${data.wpName}`, 20, 67);
            doc.text(`Tipo de Contrato: ${candidate.contractType || '-'}`, 20, 72);

            doc.text(`Periodo de Vigencia: ${data.period}`, 120, 62);
            doc.text(`Mes de Liquidación: ${MONTHS_LABELS[month - 1]} ${year}`, 120, 67);
            doc.text(`Unidad de Medida: ${data.unit}`, 120, 72);

            // Billing Summary Table
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("RESULTADO DE LA REGULARIZACIÓN", 14, 95);


            autoTable(doc, {
                startY: 100,
                head: [['CONCEPTO', 'CANTIDAD']],
                body: [
                    ['IMPORTE TOTAL A REGULARIZAR (Facturación adicional)', `${candidate.suggestedAmount.toFixed(2)} ${data.unit}`],
                    ['Importe Económico Estimado', `${candidate.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 59, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 5 }
            });

            // Monthly History Section
            const lastY = (doc as any).lastAutoTable?.finalY || 130;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("EVOLUCIÓN MENSUAL DEL CONSUMO", 14, lastY + 15);

            autoTable(doc, {
                startY: lastY + 20,
                head: [['MES/AÑO', 'CONTRATADO', 'CONSUMIDO', 'BALANCE MES', 'ACUMULADO']],
                body: data.summary.map(s => {
                    const monthBalance = s.contracted - s.consumed;
                    return [
                        s.label,
                        s.contracted.toFixed(2),
                        s.consumed.toFixed(2),
                        {
                            content: (monthBalance > 0 ? "+" : "") + monthBalance.toFixed(2),
                            styles: { textColor: monthBalance < 0 ? [220, 38, 38] : [0, 0, 0] }
                        },
                        {
                            content: s.balance.toFixed(2),
                            styles: { textColor: s.balance < 0 ? [220, 38, 38] : [0, 0, 0] }
                        }
                    ];
                }),
                theme: 'striped',
                headStyles: { fillColor: [24, 212, 80] },
                styles: { fontSize: 9, halign: 'center' },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' },
                    4: { fontStyle: 'bold' }
                }
            });

            const finalY = (doc as any).lastAutoTable?.finalY || 200;
            doc.setFillColor(240, 245, 255);
            doc.rect(14, finalY + 10, 182, 25, 'F');

            doc.setFontSize(9);
            doc.setTextColor(30, 58, 138);
            doc.setFont("helvetica", "italic");
            doc.text("Nota informativa:", 20, finalY + 18);
            doc.setFont("helvetica", "normal");
            doc.text(`Para consultar el detalle minucioso de cada imputación (tickets, autores y horas),`, 20, finalY + 24);
            doc.text(`por favor acceda a su Dashboard de Consumos en: ${window.location.origin}/client-dashboard`, 20, finalY + 29);

            doc.save(`Justificante_Regularizacion_${data.clientName}_${MONTHS_LABELS[month - 1]}_${year}.pdf`);
        } catch (error: any) {
            console.error("PDF Generation Error:", error);
            alert(`Error al generar el reporte: ${error.message || 'Error desconocido'}`);
        } finally {
            setDownloadingReport(null);
        }
    };

    const generateDraftEmail = (candidate: CierreCandidate) => {
        const clientEmails = candidate.reportEmails || "";
        const subject = `Resumen Mensual de Consumo - ${candidate.clientName} - ${MONTHS_LABELS[month - 1]} ${year}`;
        const body = `Hola,\n\nAdjunto os enviamos el resumen de consumo y regularización correspondiente al mes de ${MONTHS_LABELS[month - 1]} para el Work Package ${candidate.wpName}.\n\nQuedamos a vuestra disposición para cualquier duda.\n\nSaludos.`;

        setDraftModal({
            isOpen: true,
            candidate,
            subject,
            body
        });
    };

    const handleMarkAsSent = async (candidate: CierreCandidate) => {
        if (!confirm(`¿Marcar el reporte de ${candidate.clientName} como enviado?`)) return;

        try {
            const result = await markReportAsSent(candidate.wpId, month, year, "Admin"); // Replace with actual user if available
            if (result.success) {
                await loadData();
            } else {
                alert("Error: " + result.error);
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };

    const generateInternalSummary = () => {
        let text = `RESUMEN INTERNO DE CIERRE - ${MONTHS_LABELS[month - 1]} ${year}\n\n`;

        text += `Pendientes de Facturar:\n`;
        candidates.filter(c => c.suggestedAmount > 0).forEach(c => {
            text += `- ${c.clientName} (${c.wpName}): ${c.suggestedAmount.toFixed(1)} ${c.unit} (${c.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})\n`;
        });

        text += `\nYa Procesados:\n`;
        processed.forEach(p => {
            text += `- [OK] ${p.clientName} (${p.wpName}): ${p.suggestedAmount.toFixed(1)} ${p.unit} (${p.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})\n`;
        });

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resumen_Interno_${month}_${year}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleProcessClick = (candidate: CierreCandidate) => {
        setProcessingModal({
            isOpen: true,
            candidate,
            note: "",
            isRevenueRecognized: false,
            isBilled: true
        });
    };

    const handleSync = async (wpId: string) => {
        setSyncingWp(wpId);
        try {
            await syncWorkPackage(wpId);
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setSyncingWp(null);
        }
    };

    const confirmProcess = async () => {
        const { candidate, note, isRevenueRecognized, isBilled } = processingModal;
        if (!candidate) return;

        setProcessingWp(candidate.wpId);
        setProcessingModal(prev => ({ ...prev, isOpen: false }));

        try {
            const result = await processCierre(candidate.wpId, month, year, candidate.suggestedAmount, note, isRevenueRecognized, isBilled);
            if (result.success) {
                await downloadReport(candidate);
                await loadData();
            } else {
                alert("Error: " + result.error);
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setProcessingWp(null);
        }
    };

    const handleBatchProcess = async () => {
        const selectedCandidates = candidates.filter(c => selectedIds.includes(c.wpId));
        if (selectedCandidates.length === 0) return;

        if (!confirm(`¿Confirmas el lanzamiento masivo de la facturación para ${selectedCandidates.length} candidatos?`)) {
            return;
        }

        setBatchProcessing(true);
        try {
            const selection = selectedCandidates.map(c => ({ wpId: c.wpId, amount: c.suggestedAmount }));
            const result = await processBatchCierres(month, year, selection);

            // Auto generate PDFs for all successful ones
            for (const c of selectedCandidates) {
                await downloadReport(c);
            }

            alert(`Procesado completado:\n- Éxitos: ${result.success}\n- Errores: ${result.failed}\n\nSe han generado los justificantes correspondientes.`);
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setBatchProcessing(false);
        }
    };

    const toggleSelectAll = (filteredCandidates: CierreCandidate[]) => {
        if (selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCandidates.map(c => c.wpId));
        }
    };

    const toggleSelect = (wpId: string) => {
        setSelectedIds(prev =>
            prev.includes(wpId) ? prev.filter(id => id !== wpId) : [...prev, wpId]
        );
    };

    // --- Lógica de Filtrado en Frontend ---
    const filteredCandidates = candidates.filter(c => {
        // 1. Cliente o WP
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            if (!c.clientName.toLowerCase().includes(search) && !c.wpName.toLowerCase().includes(search)) return false;
        }

        // 2. Frecuencia
        if (filterFrequency !== "all") {
            if (c.regularizationType?.toUpperCase() !== filterFrequency.toUpperCase()) return false;
        }

        // 3. Facturar este mes
        if (filterDueOnly && !c.isDueThisMonth) return false;

        // 4. Balance Acumulado
        if (filterBalance === "negative" && c.accumulatedBalance >= -0.01) return false;
        if (filterBalance === "positive" && c.accumulatedBalance < 0.01) return false;

        return true;
    });



    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    return (
        <div className="space-y-6">
            {/* Filter Bar & Search */}
            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 w-full md:w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mes</label>
                        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                            <SelectTrigger className="border-slate-200 font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS_LABELS.map((m, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 w-full md:w-32">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Año</label>
                        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                            <SelectTrigger className="border-slate-200 font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-grow" />
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                onClick={handleBatchProcess}
                                disabled={batchProcessing}
                                className="bg-dark-green hover:bg-black text-white font-bold gap-2 animate-in fade-in slide-in-from-right-2"
                            >
                                <DollarSign className="w-4 h-4" />
                                {batchProcessing ? 'Facturando lote...' : `Facturar Seleccionados (${selectedIds.length})`}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={loadData}
                            disabled={loading}
                            className="border-slate-200 text-slate-600 font-semibold"
                        >
                            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center pt-4 border-t border-slate-50">
                    {/* Buscador */}
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar cliente o WP..."
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Frecuencia */}
                    <div className="w-full md:w-36">
                        <Select value={filterFrequency} onValueChange={setFilterFrequency}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 h-9 text-xs font-semibold">
                                <SelectValue placeholder="Frecuencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Frec.</SelectItem>
                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                                <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                                <SelectItem value="ANUAL">Anual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Balance */}
                    <div className="w-full md:w-40">
                        <Select value={filterBalance} onValueChange={(v: any) => setFilterBalance(v)}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 h-9 text-xs font-semibold">
                                <SelectValue placeholder="Balance" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="negative">Balance Negativo</SelectItem>
                                <SelectItem value="positive">Balance Positivo</SelectItem>
                                <SelectItem value="all">Todos los balances</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Facturables ahora */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 h-9">
                        <Checkbox
                            id="filterDueOnly"
                            checked={filterDueOnly}
                            onCheckedChange={(checked) => setFilterDueOnly(checked as boolean)}
                        />
                        <label htmlFor="filterDueOnly" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                            Facturar este mes
                        </label>
                    </div>
                </div>
            </div>

            {/* Candidates Table */}
            <Card className="border-none shadow-md overflow-hidden bg-slate-50/50">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-malachite" />
                        Candidatos a Regularización
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {filteredCandidates.length < candidates.length && (
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-400">
                                {filteredCandidates.length} de {candidates.length} mostrados
                            </Badge>
                        )}
                        <div className="text-xs text-slate-400 font-medium">
                            {filteredCandidates.length} candidatos cargados
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <Checkbox
                                            checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                                            onCheckedChange={() => toggleSelectAll(filteredCandidates)}
                                        />
                                    </th>
                                    <th className="px-6 py-4">Cliente / WP</th>
                                    <th className="px-6 py-4 text-right">Balance Acumulado</th>
                                    <th className="px-6 py-4">Frecuencia</th>
                                    <th className="px-6 py-4">Última Sincro</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading && filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-3 border-malachite border-t-transparent rounded-full animate-spin" />
                                                <p className="font-medium">Analizando datos de contrato...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle2 className="w-10 h-10 opacity-20" />
                                                <p className="font-medium">No hay regularizaciones que coincidan con los filtros</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((c) => (
                                        <tr key={c.wpId} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(c.wpId) ? 'bg-malachite/5' : ''}`}>
                                            <td className="px-6 py-4">
                                                <Checkbox
                                                    checked={selectedIds.includes(c.wpId)}
                                                    onCheckedChange={() => toggleSelect(c.wpId)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{c.wpName}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs text-slate-500">{c.clientName}</div>
                                                    {c.contractType && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-bold border border-slate-200 uppercase">
                                                            {c.contractType}
                                                        </span>
                                                    )}
                                                    {c.needsPO && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-bold border border-amber-200 uppercase flex items-center gap-1">
                                                            <AlertCircle className="w-2.5 h-2.5" />
                                                            Pedir PO
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-base font-bold ${c.accumulatedBalance < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                                    {c.accumulatedBalance.toFixed(1)} <span className="text-[10px] font-normal uppercase">{c.unit}</span>
                                                </div>
                                                {c.suggestedAmount > 0 && (
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-[10px] text-red-400 font-semibold italic">
                                                            Facturar: +{c.suggestedAmount.toFixed(1)} {c.unit}
                                                        </div>
                                                        <div className="text-[11px] text-red-600 font-bold whitespace-nowrap">
                                                            ({c.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold w-fit uppercase border border-slate-200">
                                                        {c.regularizationType || 'Bolsa Horas'}
                                                    </span>
                                                    {c.isDueThisMonth && (
                                                        <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            <Info className="w-2.5 h-2.5" />
                                                            <span className="text-[9px] font-bold uppercase leading-tight">Facturar este mes</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className={`w-3 h-3 ${c.needsSync ? 'text-orange-500' : 'text-slate-400'}`} />
                                                    <span className={`text-[11px] ${c.needsSync ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>
                                                        {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                                                    </span>
                                                    {c.needsSync && (
                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => downloadReport(c)}
                                                        disabled={downloadingReport === c.wpId}
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                                        title="Descargar Justificante PDF"
                                                    >
                                                        <FileText className={`w-4 h-4 ${downloadingReport === c.wpId ? 'animate-pulse' : ''}`} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSync(c.wpId)}
                                                        disabled={syncingWp === c.wpId || processingWp === c.wpId}
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-malachite hover:bg-malachite/10"
                                                        title="Sincronizar ahora"
                                                    >
                                                        <RefreshCcw className={`w-4 h-4 ${syncingWp === c.wpId ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleProcessClick(c)}
                                                        disabled={processingWp === c.wpId || syncingWp === c.wpId}
                                                        className="bg-malachite hover:bg-dark-green text-white font-bold h-8 flex items-center gap-2 shadow-sm px-4"
                                                    >
                                                        <DollarSign className="w-3.5 h-3.5" />
                                                        {processingWp === c.wpId ? '...' : 'Facturar'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Reports Section */}
            <Card className="border-none shadow-md overflow-hidden bg-slate-50/50">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-500" />
                        Reportes Mensuales a Clientes
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateInternalSummary}
                        className="text-xs font-bold gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Generar Resumen Interno
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Cliente / Contactos</th>
                                    <th className="px-6 py-4">Estado del Reporte</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">
                                            No hay datos disponibles para reportar
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((c) => (
                                        <tr key={c.wpId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{c.clientName}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-xs" title={c.reportEmails || 'No hay emails configurados'}>
                                                    {c.reportEmails || <span className="text-amber-500 font-semibold italic">Sin contactos configurados</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.reportSentAt ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1 w-fit">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Enviado
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(c.reportSentAt).toLocaleDateString()} por {c.reportSentBy}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-400 border-slate-200 gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => generateDraftEmail(c)}
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                                                        title="Generar Borrador Email"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleMarkAsSent(c)}
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                                                        title="Marcar como enviado"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Eventos Monitoring Table */}
            <Card className="border-none shadow-md overflow-hidden bg-slate-50/50">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Monitoreo de Eventos (Consumo vs Scope)
                    </CardTitle>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Exceso de consumo
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Cliente / WP Eventos</th>
                                    <th className="px-6 py-4 text-center">Detalle por Mes (Consumo / Contractado)</th>
                                    <th className="px-6 py-4 text-right">TOTAL ACUMULADO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {eventosMonitor.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">
                                            No se han encontrado contratos de tipo Eventos en el periodo seleccionado
                                        </td>
                                    </tr>
                                ) : (
                                    eventosMonitor.map((ev) => (
                                        <tr key={ev.wpId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 min-w-[250px]">
                                                <div className="font-bold text-slate-900 leading-tight">{ev.wpName}</div>
                                                <div className="text-xs text-slate-500 mt-1">{ev.clientName}</div>
                                                <div className="mt-2 text-[9px] font-bold text-slate-300 uppercase underline decoration-malachite/30">Cómputo en {ev.unit}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2 pb-2">
                                                    {ev.months.map((m, idx) => (
                                                        <div key={idx} className={`flex-shrink-0 p-2 rounded-lg border text-center min-w-[80px] ${m.isExceeded ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</div>
                                                            <div className={`text-sm font-bold ${m.isExceeded ? 'text-red-600' : 'text-slate-700'}`}>
                                                                {m.consumed.toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">/ {m.contracted.toFixed(0)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-base font-black ${ev.isTotalExceeded ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {ev.totalConsumed.toFixed(0)} <span className="text-[10px] text-slate-400 font-normal">/ {ev.totalContracted.toFixed(0)}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Periodo</div>
                                                {ev.isTotalExceeded && (
                                                    <div className="text-[10px] text-red-400 font-bold italic mt-1 leading-none">
                                                        +{Math.abs(ev.totalConsumed - ev.totalContracted).toFixed(0)} exceso
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <EvolutivosBillingPanel clientId="all" year={year} month={month} />

            {/* Already Processed Closures Section - HIGHER VISIBILITY */}
            {processed.length > 0 && (
                <div className="bg-emerald-50/50 p-6 rounded-2xl border-2 border-emerald-200 border-dashed space-y-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                        <div className="bg-emerald-100 p-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Cierres ya procesados en {MONTHS_LABELS[month - 1]}</h2>
                        <Badge className="bg-emerald-600 ml-2">{processed.length}</Badge>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <Table>
                            <TableBody>
                                {processed.map(p => (
                                    <TableRow key={p.wpId} className="hover:bg-slate-50/50">
                                        <TableCell className="w-[40%]">
                                            <div className="font-bold text-slate-700">{p.wpName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.clientName}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Facturado</div>
                                            <div className="text-sm font-black text-malachite">
                                                {p.suggestedAmount.toFixed(1)} {p.unit}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Importe (Est.)</div>
                                            <div className="text-sm font-bold text-slate-600">
                                                {p.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadReport(p)}
                                                disabled={downloadingReport === p.wpId}
                                                className="border-slate-200 text-slate-500 hover:text-malachite hover:border-malachite h-8 gap-2 rounded-lg transition-all"
                                            >
                                                {downloadingReport === p.wpId ? (
                                                    <RefreshCcw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <FileText className="w-4 h-4" />
                                                )}
                                                Descargar Copia
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Redesigned note box */}
            <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row gap-6 shadow-sm">
                <div className="bg-slate-50 p-4 rounded-xl h-fit w-fit flex-shrink-0 border border-slate-100">
                    <Info className="w-8 h-8 text-malachite" />
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">Guía de Gestión Administrativa</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-malachite uppercase tracking-wider">Regularización de Bolsas</p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Las bolsas se facturan por su **balance acumulado**. Si un cliente consume más horas de las contratadas históricamente, el sistema propone facturar el exceso total. El botón "Facturar" genera este registro en el sistema.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[11px] font-black text-blue-500 uppercase tracking-wider">Monitoreo de Eventos</p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Los eventos no se acumulan. La tabla muestra la salud mensual del scope. Si ves **excesos recurrentes** (rojo), usa estos datos para proponer una subida de cuota mensual o el cobro de un lote de tickets adicional.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-400 italic">
                            * Nota: Toda acción de facturación implica una sincronización automática final para asegurar que ni un solo minuto de JIRA se quede sin registrar.
                        </p>
                    </div>
                </div>
            </div>

            {/* Processing Modal */}
            <Dialog
                open={processingModal.isOpen}
                onOpenChange={(open) => setProcessingModal(prev => ({ ...prev, isOpen: open }))}
            >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-malachite" />
                            Facturación de Regularización
                        </DialogTitle>
                        <DialogDescription>
                            Configure los detalles de la facturación para {processingModal.candidate?.clientName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad a Facturar</p>
                                <p className="text-2xl font-black text-slate-800">
                                    {processingModal.candidate?.suggestedAmount.toFixed(1)}
                                    <span className="text-sm font-normal text-slate-500 ml-1 uppercase">{processingModal.candidate?.unit}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Importe Económico</p>
                                <p className="text-xl font-bold text-malachite">
                                    {processingModal.candidate?.suggestedCashAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="note">Nota Addicional (opcional)</Label>
                            <Textarea
                                id="note"
                                placeholder="Ej: Facturación correspondiente a la bolsa del Q3..."
                                value={processingModal.note}
                                onChange={(e) => setProcessingModal(prev => ({ ...prev, note: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/30 rounded-lg border">
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="revenue-rec" className="flex flex-col gap-1 cursor-pointer">
                                    <span className="font-bold">Reconcimiento Ingreso</span>
                                    <span className="font-normal text-[10px] text-muted-foreground leading-tight">Incluir en métricas aunque no haya factura.</span>
                                </Label>
                                <Switch
                                    id="revenue-rec"
                                    checked={processingModal.isRevenueRecognized}
                                    onCheckedChange={(val) => setProcessingModal(prev => ({ ...prev, isRevenueRecognized: val }))}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="billed" className="flex flex-col gap-1 cursor-pointer">
                                    <span className="font-bold">Facturado</span>
                                    <span className="font-normal text-[10px] text-muted-foreground leading-tight">Marcar si ya existe factura emitida.</span>
                                </Label>
                                <Switch
                                    id="billed"
                                    checked={processingModal.isBilled}
                                    onCheckedChange={(val) => setProcessingModal(prev => ({ ...prev, isBilled: val }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessingModal(prev => ({ ...prev, isOpen: false }))}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmProcess} className="bg-malachite hover:bg-dark-green text-white font-bold gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmar y Descargar Reporte
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Draft Email Modal */}
            <Dialog
                open={draftModal.isOpen}
                onOpenChange={(open) => setDraftModal(prev => ({ ...prev, isOpen: open }))}
            >
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            Borrador de Reporte Mensual
                        </DialogTitle>
                        <DialogDescription>
                            Copie este contenido para enviarlo por email al cliente
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Destinatarios</Label>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-between">
                                <span className="truncate flex-grow mr-2">{draftModal.candidate?.reportEmails || "Sin emails configurados"}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => {
                                        if (draftModal.candidate?.reportEmails) {
                                            navigator.clipboard.writeText(draftModal.candidate.reportEmails);
                                        }
                                    }}
                                >
                                    Copiar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Asunto</Label>
                            <Input value={draftModal.subject} readOnly className="bg-slate-50 border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <Label>Cuerpo del Mensaje</Label>
                            <Textarea
                                value={draftModal.body}
                                readOnly
                                className="bg-slate-50 border-slate-200 min-h-[150px]"
                            />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-normal">
                                **Importante:** Recuerde adjuntar el justificante PDF descargado previamente antes de enviar el correo.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDraftModal(prev => ({ ...prev, isOpen: false }))}>
                            Cerrar
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                            onClick={() => {
                                const mailto = `mailto:${draftModal.candidate?.reportEmails || ''}?subject=${encodeURIComponent(draftModal.subject)}&body=${encodeURIComponent(draftModal.body)}`;
                                window.location.href = mailto;
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Abrir en Outlook/Mail
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
