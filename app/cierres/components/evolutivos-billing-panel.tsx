"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEvolutivosForBilling, markEvolutivoAsBilled, unmarkEvolutivoAsBilled, getEvolutivoWorklogDetails } from "@/app/actions/evolutivos-billing";
import { FileText, Loader2, DollarSign, Download, Filter, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Switch } from "@/components/ui/switch";
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
    const [filterStatus, setFilterStatus] = useState<string>("all");

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

    const handleToggleBilled = async (issueKey: string, currentStatus: boolean, wpId: string) => {
        setTogglingBilled(issueKey);
        try {
            if (currentStatus) {
                const res = await unmarkEvolutivoAsBilled(issueKey, year, month);
                if (res.success) {
                    setEvolutivos(prev => prev.map(e => e.issueKey === issueKey ? { ...e, isBilled: false } : e));
                    toast.success(`${issueKey} marcado como pendiente`);
                }
            } else {
                const res = await markEvolutivoAsBilled(issueKey, year, month, wpId);
                if (res.success) {
                    setEvolutivos(prev => prev.map(e => e.issueKey === issueKey ? { ...e, isBilled: true } : e));
                    toast.success(`${issueKey} marcado como facturado`);
                    // Generate granular report
                    const evo = evolutivos.find(e => e.issueKey === issueKey);
                    if (evo) {
                        await generateGranularReport(evo, adjustedHours[issueKey], totalAmounts[issueKey]);
                    }
                }
            }
        } catch (error) {
            toast.error("Error al cambiar estado de facturación");
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
        const matchesStatus = filterStatus === "all" ||
            (filterStatus === "billed" && evo.isBilled) ||
            (filterStatus === "pending" && !evo.isBilled);
        return matchesMode && matchesStatus;
    });

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

                    <Select value={filterStatus} onValueChange={setFilterStatus} disabled={isLoading}>
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                            <SelectValue placeholder="Estado de Facturación" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Estados</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="billed">Facturados</SelectItem>
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
                    <div className="space-y-4">
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Estado</TableHead>
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
                                    {filteredEvolutivos.map((evo) => (
                                        <TableRow key={evo.issueKey} className={evo.isBilled ? "bg-green-50/30" : ""}>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={evo.isBilled}
                                                        disabled={togglingBilled === evo.issueKey}
                                                        onCheckedChange={() => handleToggleBilled(evo.issueKey, !!evo.isBilled, evo.workPackageId)}
                                                    />
                                                    {evo.isBilled && <CheckCircle2 className="w-4 h-4 text-green-600 animate-in zoom-in" />}
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
                                                    className={`w-20 text-right h-8 text-sm focus-visible:ring-green-500 ${evo.isBilled ? 'bg-green-100/50 border-green-200' : ''}`}
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
                                    ))}
                                    <TableRow className="bg-slate-50/80 font-bold border-t-2">
                                        <TableCell colSpan={7} className="text-right text-slate-600 uppercase text-xs tracking-widest">
                                            Total Facturable
                                        </TableCell>
                                        <TableCell className="text-right text-green-700 text-lg">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Object.values(totalAmounts).reduce((a, b) => a + b, 0))}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <Info className="w-4 h-4 text-blue-400" />
                            <p>Usa los filtros superiores para organizar el listado. Marca como facturado para llevar el control de lo que ya se ha procesado.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

