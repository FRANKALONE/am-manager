"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEvolutivosForBilling, markEvolutivoAsBilled, unmarkEvolutivoAsBilled, getEvolutivoWorklogDetails } from "@/app/actions/evolutivos-billing";
import { FileText, Loader2, DollarSign, Download, Filter, CheckCircle2, Info, Eye, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/date-utils";

const MONTHS_LABELS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface Props {
    clientId: string;
    year: number;
    month: number;
}

export function EvolutivosBillingPanel({ clientId, year, month }: Props) {
    const [evolutivos, setEvolutivos] = useState<any[]>([]);
    const [adjustedHours, setAdjustedHours] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [togglingBilled, setTogglingBilled] = useState<string | null>(null);
    const [totalAmounts, setTotalAmounts] = useState<Record<string, number>>({});

    // Filters
    const [filterMode, setFilterMode] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<"pending" | "billed">("pending");

    // Removed auto-load on mount - user must click "Actualizar" button

    const loadEvolutivos = async () => {
        setIsLoading(true);
        try {
            const res = await getEvolutivosForBilling(clientId, year, month);
            if (res.success) {
                setEvolutivos(res.evolutivos);
                // Initialize adjusted hours with worked hours and total amounts
                const initial: Record<string, number> = {};
                const amounts: Record<string, number> = {};
                res.evolutivos.forEach((evo: any) => {
                    initial[evo.issueKey] = evo.workedHours;
                    amounts[evo.issueKey] = evo.rate > 0 ? evo.workedHours * evo.rate : 0;
                });
                setAdjustedHours(initial);
                setTotalAmounts(amounts);
            } else {
                toast.error(res.error || "Error al cargar evolutivos");
            }
        } catch (error) {
            toast.error("Error al cargar evolutivos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProcessBilling = async (evo: any) => {
        setTogglingBilled(evo.issueKey);
        try {
            const res = await markEvolutivoAsBilled(evo.issueKey, year, month, evo.workPackageId);
            if (res.success) {
                setEvolutivos(prev => prev.map(e => e.issueKey === evo.issueKey ? { ...e, isBilled: true } : e));
                toast.success(`${evo.issueKey} facturado correctamente`);

                // Generate granular report
                await generateGranularReport(evo, adjustedHours[evo.issueKey], totalAmounts[evo.issueKey]);
            } else {
                toast.error(res.error || "Error al marcar como facturado");
            }
        } catch (error) {
            toast.error("Error al procesar la facturación");
        } finally {
            setTogglingBilled(null);
        }
    };

    const handleCancelBilling = async (issueKey: string) => {
        if (!confirm(`¿Estás seguro de que deseas anular la facturación de ${issueKey}?`)) return;

        setTogglingBilled(issueKey);
        try {
            const res = await unmarkEvolutivoAsBilled(issueKey, year, month);
            if (res.success) {
                setEvolutivos(prev => prev.map(e => e.issueKey === issueKey ? { ...e, isBilled: false } : e));
                toast.success(`Facturación de ${issueKey} anulada`);
            } else {
                toast.error(res.error || "Error al anular facturación");
            }
        } catch (error) {
            toast.error("Error al anular la facturación");
        } finally {
            setTogglingBilled(null);
        }
    };

    const handleHoursChange = (issueKey: string, value: string) => {
        const hours = parseFloat(value) || 0;
        setAdjustedHours(prev => ({ ...prev, [issueKey]: hours }));

        // Auto-update total amount if rate exists
        const evo = evolutivos.find(e => e.issueKey === issueKey);
        if (evo && evo.rate > 0) {
            setTotalAmounts(prev => ({ ...prev, [issueKey]: hours * evo.rate }));
        }
    };

    const handleAmountChange = (issueKey: string, value: string) => {
        const amount = parseFloat(value) || 0;
        setTotalAmounts(prev => ({ ...prev, [issueKey]: amount }));
    };

    const filteredEvolutivos = evolutivos.filter(evo => {
        const matchesMode = filterMode === "all" || evo.billingMode === filterMode;
        return matchesMode;
    });

    const pendingEvolutivos = filteredEvolutivos.filter(evo => !evo.isBilled);
    const billedEvolutivos = filteredEvolutivos.filter(evo => evo.isBilled);

    const getTotalHours = () => {
        return filteredEvolutivos.reduce((sum, evo) => sum + (adjustedHours[evo.issueKey] || 0), 0);
    };

    const generateReport = async () => {
        if (filteredEvolutivos.length === 0) return;

        setIsGenerating(true);
        try {
            const doc = new jsPDF();

            // Logo / Header
            try {
                doc.addImage("/logo-am.png", 'PNG', 14, 10, 22, 13);
            } catch (e) {
                doc.setFontSize(14);
                doc.setTextColor(0, 59, 40);
                doc.text("ALTIM AMA", 14, 20);
            }

            doc.setFontSize(16);
            doc.setTextColor(0, 59, 40);
            const title = "REPORTE DE FACTURACIÓN DE EVOLUTIVOS";
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, 210 - titleWidth - 14, 20);

            doc.setDrawColor(24, 212, 80);
            doc.line(14, 30, 196, 30);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Periodo: ${MONTHS_LABELS[month - 1]} ${year}`, 14, 38);
            doc.text(`Fecha de emisión: ${formatDate(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })}`, 14, 43);

            // Table Data
            const tableData = filteredEvolutivos.map(evo => [
                evo.issueKey,
                evo.issueSummary,
                evo.clientName,
                evo.billingMode,
                `${adjustedHours[evo.issueKey]?.toFixed(2) || "0.00"} h`
            ]);

            autoTable(doc, {
                startY: 50,
                head: [['Ticket', 'Resumen', 'Cliente', 'Modo Facturación', 'Horas a Facturar']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 59, 40], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 30, halign: 'right' }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 59, 40);
            doc.text(`TOTAL HORAS A FACTURAR: ${getTotalHours().toFixed(2)} h`, 196, finalY, { align: 'right' });

            doc.save(`Reporte_Facturacion_Evolutivos_${MONTHS_LABELS[month - 1]}_${year}.pdf`);

            toast.success("Reporte generado correctamente");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar el reporte PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    const generateGranularReport = async (evo: any, hours: number, amount: number) => {
        setIsGenerating(true);
        try {
            const res = await getEvolutivoWorklogDetails(evo.issueKey, year, month);
            if (!res.success) {
                toast.error("Error al obtener detalles de worklogs");
                return;
            }

            const doc = new jsPDF();

            // Logo / Header
            try {
                doc.addImage("/logo-am.png", 'PNG', 14, 10, 22, 13);
            } catch (e) {
                doc.setFontSize(14);
                doc.setTextColor(0, 59, 40);
                doc.text("ALTIM AMA", 14, 20);
            }

            doc.setFontSize(16);
            doc.setTextColor(0, 59, 40);
            const title = "REPORTE DETALLADO DE EVOLUTIVO";
            const titleWidth = doc.getTextWidth(title);
            doc.text(title, 210 - titleWidth - 14, 20);

            doc.setDrawColor(24, 212, 80);
            doc.line(14, 30, 196, 30);

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("DATOS DEL TICKET", 14, 40);

            doc.setFont("helvetica", "normal");
            doc.text(`Ticket: ${evo.issueKey}`, 14, 47);
            doc.text(`Resumen: ${evo.issueSummary}`, 14, 52);
            doc.text(`Cliente: ${evo.clientName}`, 14, 57);
            doc.text(`WP: ${evo.workPackageName}`, 14, 62);
            doc.text(`Periodo: ${MONTHS_LABELS[month - 1]} ${year}`, 120, 47);
            doc.text(`Modo Facturación: ${evo.billingMode}`, 120, 52);
            doc.text(`Tarifa Aplicada: ${evo.rate > 0 ? `${evo.rate.toFixed(2)} €/h` : 'Manual'}`, 120, 57);

            // Summary Table
            autoTable(doc, {
                startY: 70,
                head: [['CONCEPTO', 'VALOR']],
                body: [
                    ['Horas Reales Trabajadas (Mes)', `${evo.workedHours.toFixed(2)} h`],
                    ['Horas Ajustadas para Facturación', `${hours.toFixed(2)} h`],
                    ['IMPORTE TOTAL A FACTURAR', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 59, 40], textColor: [255, 255, 255] },
                styles: { fontSize: 10, cellPadding: 5 }
            });

            // Worklogs Details
            const lastY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFont("helvetica", "bold");
            doc.text("DETALLE DE DEDICACIÓN (WORKLOGS)", 14, lastY);

            const tableDetail = res.worklogs.map((wl: any) => [
                formatDate(wl.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' }),
                wl.author,
                wl.tipoImputacion || 'N/A',
                `${wl.timeSpentHours.toFixed(2)} h`
            ]);

            autoTable(doc, {
                startY: lastY + 5,
                head: [['Fecha', 'Persona', 'Tipo Imputación', 'Horas']],
                body: tableDetail,
                theme: 'striped',
                headStyles: { fillColor: [24, 212, 80] },
                styles: { fontSize: 9 }
            });

            doc.save(`Detalle_Facturacion_${evo.issueKey}_${month}_${year}.pdf`);
            toast.success("Resumen detallado generado");
        } catch (error) {
            console.error("Error generating granular report:", error);
            toast.error("Error al generar resumen detallado");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!clientId) return null;

    const uniqueModes = Array.from(new Set(evolutivos.map(e => e.billingMode)));

    return (
        <Card className="border-t-4 border-t-green-500 shadow-lg">
            <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <DollarSign className="h-6 w-6 text-green-600" />
                            Facturación de Evolutivos
                        </CardTitle>
                        <CardDescription>
                            Control de facturación para evolutivos con dedicación en {MONTHS_LABELS[month - 1]} {year}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={loadEvolutivos}
                            disabled={isLoading}
                            variant="outline"
                            className="shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Actualizar
                                </>
                            )}
                        </Button>
                        {filteredEvolutivos.length > 0 && (
                            <Button
                                onClick={generateReport}
                                disabled={isGenerating || isLoading}
                                className="bg-green-600 hover:bg-green-700 shadow-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Generar Reporte
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* FILTERS AREA */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Filtros:</span>
                    </div>

                    <Select value={filterMode} onValueChange={setFilterMode} disabled={isLoading}>
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                            <SelectValue placeholder="Modo de Facturación" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Modos</SelectItem>
                            {uniqueModes.map(mode => (
                                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex-grow" />

                    <div className="text-xs font-medium text-slate-400 flex items-center">
                        Mostrando {filteredEvolutivos.length} de {evolutivos.length}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                ) : evolutivos.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No hay evolutivos facturables con dedicación en este mes.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Tabs className="bg-white dark:bg-slate-900 border-none shadow-none">
                            <TabsList className="bg-slate-100/80 p-1 rounded-xl mb-4 border border-slate-200">
                                <TabsTrigger
                                    active={activeTab === "pending"}
                                    onClick={() => setActiveTab("pending")}
                                    value="pending"
                                    className="px-6 py-2 rounded-lg transition-all"
                                >
                                    Pendientes ({pendingEvolutivos.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    active={activeTab === "billed"}
                                    onClick={() => setActiveTab("billed")}
                                    value="billed"
                                    className="px-6 py-2 rounded-lg transition-all"
                                >
                                    Ya Facturados ({billedEvolutivos.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent active={activeTab === "pending"} value="pending">
                                <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                                    <Table>
                                        <TableHeader className="bg-slate-50 border-b">
                                            <TableRow>
                                                <TableHead>Acción</TableHead>
                                                <TableHead>Ticket</TableHead>
                                                <TableHead>Resumen</TableHead>
                                                <TableHead>WP / Cliente</TableHead>
                                                <TableHead>Modo Fact.</TableHead>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">H. Reales</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">H. Facturar</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Tarifa</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Importe</th>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingEvolutivos.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                                                        No hay evolutivos pendientes de facturar con los filtros aplicados.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                pendingEvolutivos.map((evo) => (
                                                    <TableRow key={evo.issueKey}>
                                                        <TableCell className="py-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleProcessBilling(evo)}
                                                                disabled={togglingBilled === evo.issueKey}
                                                                className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 flex items-center gap-2 shadow-sm px-4"
                                                            >
                                                                {togglingBilled === evo.issueKey ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <DollarSign className="w-3.5 h-3.5" />
                                                                )}
                                                                Facturar
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-700">{evo.issueKey}</TableCell>
                                                        <TableCell className="max-w-xs truncate" title={evo.issueSummary}>
                                                            {evo.issueSummary}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-bold text-slate-600">{evo.workPackageName}</div>
                                                            <div className="text-[10px] text-slate-400">{evo.clientName}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase truncate max-w-[120px]">
                                                                {evo.billingMode}
                                                            </Badge>
                                                        </TableCell>
                                                        <td className="px-4 py-3 text-right text-slate-400 font-medium italic">
                                                            {evo.workedHours.toFixed(2)}h
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Input
                                                                type="number"
                                                                step="0.25"
                                                                min="0"
                                                                value={adjustedHours[evo.issueKey] || 0}
                                                                onChange={(e) => handleHoursChange(evo.issueKey, e.target.value)}
                                                                className="w-20 text-right h-8 text-sm focus-visible:ring-green-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-[11px] font-bold text-slate-600">
                                                            {evo.rate > 0 ? `${evo.rate.toFixed(2)}€` : <span className="text-amber-500 italic">No def.</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                readOnly={evo.rate > 0}
                                                                value={totalAmounts[evo.issueKey] || 0}
                                                                onChange={(e) => handleAmountChange(evo.issueKey, e.target.value)}
                                                                className={`w-24 text-right h-8 text-sm font-bold focus-visible:ring-green-500 ${evo.rate > 0 ? 'bg-slate-50 text-slate-500' : 'bg-amber-50 border-amber-200'}`}
                                                            />
                                                        </td>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            <TabsContent active={activeTab === "billed"} value="billed">
                                <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                                    <Table>
                                        <TableHeader className="bg-slate-50 border-b">
                                            <TableRow>
                                                <TableHead className="text-center">Acciones</TableHead>
                                                <TableHead>Ticket</TableHead>
                                                <TableHead>Resumen</TableHead>
                                                <TableHead>WP / Cliente</TableHead>
                                                <TableHead>Modo Fact.</TableHead>
                                                <TableHead className="text-right">Horas</TableHead>
                                                <TableHead className="text-right">Importe</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {billedEvolutivos.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                                                        Aún no se ha facturado ningún evolutivo en este periodo.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                billedEvolutivos.map((evo) => (
                                                    <TableRow key={evo.issueKey} className="bg-green-50/20 hover:bg-green-50/40 transition-colors">
                                                        <TableCell className="py-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => generateGranularReport(evo, adjustedHours[evo.issueKey], totalAmounts[evo.issueKey])}
                                                                    className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                    title="Ver Justificante"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleCancelBilling(evo.issueKey)}
                                                                    disabled={togglingBilled === evo.issueKey}
                                                                    className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 text-[11px] font-bold gap-1"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    Anular
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-700">{evo.issueKey}</TableCell>
                                                        <TableCell className="max-w-xs truncate" title={evo.issueSummary}>
                                                            {evo.issueSummary}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-bold text-slate-600">{evo.workPackageName}</div>
                                                            <div className="text-[10px] text-slate-400">{evo.clientName}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] font-bold">
                                                                FACTURADO
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {adjustedHours[evo.issueKey]?.toFixed(2)}h
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-green-700">
                                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalAmounts[evo.issueKey] || 0)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {activeTab === "pending" && pendingEvolutivos.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <Card className="bg-slate-50 border-slate-200 shadow-none">
                                    <CardContent className="p-4 flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Horas</div>
                                            <div className="text-xl font-bold text-slate-700">{getTotalHours().toFixed(2)}h</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Importe</div>
                                            <div className="text-2xl font-black text-green-700">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pendingEvolutivos.reduce((a, b) => a + (totalAmounts[b.issueKey] || 0), 0))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <Info className="w-4 h-4 text-blue-400" />
                            <p>Usa la pestaña <strong>Pendientes</strong> para facturar nuevos evolutivos y <strong>Ya Facturados</strong> para consultar o anular cierres realizados.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

