"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEvolutivosForBilling, markEvolutivoAsBilled, unmarkEvolutivoAsBilled } from "@/app/actions/evolutivos-billing";
import { FileText, Loader2, DollarSign, Download, Filter, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

    // Filters
    const [filterMode, setFilterMode] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    useEffect(() => {
        if (clientId && year && month) {
            loadEvolutivos();
        }
    }, [clientId, year, month]);

    const loadEvolutivos = async () => {
        setIsLoading(true);
        try {
            const res = await getEvolutivosForBilling(clientId, year, month);
            if (res.success) {
                setEvolutivos(res.evolutivos);
                // Initialize adjusted hours with worked hours
                const initial: Record<string, number> = {};
                res.evolutivos.forEach((evo: any) => {
                    initial[evo.issueKey] = evo.workedHours;
                });
                setAdjustedHours(initial);
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
            doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 14, 43);

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
                        {filteredEvolutivos.length > 0 && (
                            <Button
                                onClick={generateReport}
                                disabled={isGenerating}
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

                    <Select value={filterMode} onValueChange={setFilterMode}>
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

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-50/80 font-bold border-t-2">
                                        <TableCell colSpan={6} className="text-right text-slate-600 uppercase text-xs tracking-widest">
                                            Total Facturable
                                        </TableCell>
                                        <TableCell className="text-right text-green-700 text-lg">
                                            {getTotalHours().toFixed(2)}h
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

