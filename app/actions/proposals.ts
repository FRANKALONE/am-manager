"use server";

import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";

export async function generateProposalAction(clientId: string, type: string, insightData: any) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) throw new Error("Cliente no encontrado");

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        // --- COVER PAGE ---
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 2000 },
                            children: [
                                new TextRun({
                                    text: "PROPUESTA DE OPTIMIZACIÓN DEL SERVICIO",
                                    bold: true,
                                    size: 48,
                                    color: "1e40af"
                                })
                            ]
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 500 },
                            children: [
                                new TextRun({
                                    text: `Cliente: ${client.name}`,
                                    size: 32,
                                    bold: true
                                })
                            ]
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200 },
                            children: [
                                new TextRun({
                                    text: `Área de Enfoque: ${type}`,
                                    size: 24,
                                    italics: true
                                })
                            ]
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 4000 },
                            children: [
                                new TextRun({
                                    text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
                                    size: 20
                                })
                            ]
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: "Confidencial - Altim AM Manager Advisor",
                                    size: 16,
                                    color: "6b7280"
                                })
                            ]
                        }),

                        // --- SECTION 1: CONTEXT ---
                        new Paragraph({
                            text: "1. Resumen Ejecutivo",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 1000, after: 300 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Tras un análisis exhaustivo del ruido operativo y la demanda de soporte del servicio, Altim ha identificado una oportunidad estratégica para mejorar la eficiencia del sistema y reducir costes operativos en el área de ",
                                }),
                                new TextRun({
                                    text: type,
                                    bold: true
                                }),
                                new TextRun({
                                    text: "."
                                })
                            ]
                        }),
                        new Paragraph({
                            spacing: { before: 200 },
                            text: "Esta propuesta detalla los hallazgos basados en datos reales y propone un plan de acción para transformar horas de soporte reactivo en capacidad de evolución e innovación."
                        }),

                        // --- SECTION 2: ANALYSIS ---
                        new Paragraph({
                            text: "2. Análisis Detallado (Análisis de Causa Raíz)",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 500, after: 300 }
                        }),
                        new Paragraph({
                            text: insightData.justification || "Basado en los patrones de incidencias detectados recientemente.",
                            spacing: { after: 300 }
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({ text: "Datos Clave del Periodo:", bold: true })
                            ],
                            spacing: { after: 200 }
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor Detectado", bold: true })] })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "Volumen de Incidencias" })] }),
                                        new TableCell({ children: [new Paragraph({ text: `${insightData.count} tickets` })] }),
                                    ]
                                }),
                                new TableRow({
                                    children: [
                                        new TableCell({ children: [new Paragraph({ text: "Carga Horaria" })] }),
                                        new TableCell({ children: [new Paragraph({ text: `${insightData.hours} horas` })] }),
                                    ]
                                })
                            ]
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({ text: "Ejemplos de Incidencias Analizadas:", bold: true })
                            ],
                            spacing: { before: 300, after: 200 }
                        }),
                        ...(insightData.sampleTickets || []).map((t: any) =>
                            new Paragraph({
                                text: `• [${t.key}] ${t.summary} (${new Date(t.date).toLocaleDateString()} )`,
                                spacing: { after: 100 }
                            })
                        ),

                        // --- SECTION 3: PROPOSED SOLUTION ---
                        new Paragraph({
                            text: "3. Plan de Acción Propuesto",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 500, after: 300 }
                        }),
                        new Paragraph({
                            text: "Para mitigar este ruido operativo, se proponen las siguientes líneas de actuación:",
                            spacing: { after: 200 }
                        }),
                        new Paragraph({ text: "• Auditoría de procesos: [DETALLAR AQUÍ PASOS ESPECÍFICOS]", spacing: { before: 100 } }),
                        new Paragraph({ text: "• Corrección técnica / Evolutivo: Implementación de mejoras en los componentes detectados para automatizar o prevenir estos errores." }),
                        new Paragraph({ text: "• Formación a Usuarios: Si el ruido es funcional, realizar una sesión de capacitación para reducir el volumen de consultas." }),

                        // --- SECTION 4: ROI ---
                        new Paragraph({
                            text: "4. Beneficios Estimados (ROI)",
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 500, after: 300 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Estimamos una reducción potencial de entre el 40% y el 60% de la carga actual detectada.",
                                    bold: true
                                })
                            ]
                        }),
                        new Paragraph({
                            text: `Potencial de liberación de capacidad: ~${(insightData.hours * 0.5).toFixed(0)} - ${(insightData.hours * 0.7).toFixed(0)} horas anuales que podrán reinvertirse en proyectos de innovación sin aumentar el presupuesto de mantenimiento.`
                        }),

                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { before: 2000 },
                            children: [
                                new TextRun({
                                    text: "Propuesta generada automáticamente por ",
                                    size: 14,
                                    italics: true
                                }),
                                new TextRun({
                                    text: "Altim AM Manager Advisor V1.0",
                                    size: 14,
                                    bold: true,
                                    italics: true
                                })
                            ]
                        })
                    ]
                }
            ]
        });

        const b64 = await Packer.toBase64String(doc);
        return {
            success: true,
            data: b64,
            filename: `Propuesta_Optimizacion_${client.name.replace(/\s+/g, '_')}_${type.replace(/\s+/g, '_')}.docx`
        };
    } catch (error: any) {
        console.error("Error generating Word proposal:", error);
        return { success: false, error: error.message };
    }
}

export async function notifyProposalRequestAction(clientId: string, type: string, insightData: any) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { name: true, manager: true }
        });

        if (!client) throw new Error("Cliente no encontrado");

        // Use the existing notification system
        const { createNotification } = await import("./notifications");

        // We'll use a generic type or create a new one if needed.
        // For now, let's use SYSTEM as a group.
        await createNotification('PROPOSAL_REQUESTED', {
            clientName: client.name,
            topic: type,
            details: insightData.justification || insightData.summary || type
        }, clientId, clientId, client.manager || undefined);

        return { success: true };
    } catch (error: any) {
        console.error("Error notifying proposal request:", error);
        return { success: false, error: error.message };
    }
}
