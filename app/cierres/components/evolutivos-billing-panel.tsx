"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEvolutivosForBilling } from "@/app/actions/evolutivos-billing";
import { FileText, Loader2, DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

    const handleHoursChange = (issueKey: string, value: string) => {
        const hours = parseFloat(value) || 0;
        setAdjustedHours(prev => ({ ...prev, [issueKey]: hours }));
    };

    const getTotalHours = () => {
        return Object.values(adjustedHours).reduce((sum, hours) => sum + hours, 0);
    };

    const generateReport = async () => {
        if (evolutivos.length === 0) return;

        setIsGenerating(true);
        try {
            const doc = new jsPDF();

            // Logo / Header
            try {
                doc.addImage("/logo-am.png", 'PNG', 14, 10, 22, 13);
            } catch (e) {
                // Fallback if logo not found
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
            const tableData = evolutivos.map(evo => [
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

            // Final total
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

    if (!clientId) {
        return null;
    }

    return (
        <Card className="border-t-4 border-t-green-500">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Facturación de Evolutivos
                        </CardTitle>
                        <CardDescription>
                            Evolutivos T&M Facturable y Facturable con dedicación en {month}/{year}
                        </CardDescription>
                    </div>
                    {evolutivos.length > 0 && (
                        <Button
                            onClick={generateReport}
                            disabled={isGenerating}
                            className="bg-green-600 hover:bg-green-700"
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
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                ) : evolutivos.length === 0 ? (
                    <div className="text-center p-12 text-muted-foreground">
                        <p>No hay evolutivos facturables con dedicación en este mes.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket</TableHead>
                                        <TableHead>Resumen</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Work Package</TableHead>
                                        <TableHead>Modo Facturación</TableHead>
                                        <TableHead className="text-right">Horas Trabajadas</TableHead>
                                        <TableHead className="text-right">Horas a Facturar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {evolutivos.map((evo) => (
                                        <TableRow key={evo.issueKey}>
                                            <TableCell className="font-medium">{evo.issueKey}</TableCell>
                                            <TableCell className="max-w-md truncate">{evo.issueSummary}</TableCell>
                                            <TableCell className="font-semibold">{evo.clientName}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{evo.workPackageName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{evo.billingMode}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {evo.workedHours.toFixed(2)}h
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    step="0.25"
                                                    min="0"
                                                    value={adjustedHours[evo.issueKey] || 0}
                                                    onChange={(e) => handleHoursChange(evo.issueKey, e.target.value)}
                                                    className="w-24 text-right"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-green-50 font-semibold">
                                        <TableCell colSpan={6} className="text-right">TOTAL</TableCell>
                                        <TableCell className="text-right text-green-700 text-lg">
                                            {getTotalHours().toFixed(2)}h
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            <p>💡 Puedes ajustar las horas a facturar antes de generar el reporte.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
