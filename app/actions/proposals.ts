"use server";

import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { formatShortDate } from "@/lib/date-utils";

export async function generateProposalAction(clientId: string, type: string, insightData: any) {
    console.log('[PROPOSAL-SERVER] Starting generation:', { clientId, type, sampleTickets: insightData.sampleTickets?.length });

    try {
        const client = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!client) throw new Error("Cliente no encontrado");

        console.log('[PROPOSAL-SERVER] Client found:', client.name);

        // --- SPECIFIC RECOMMENDATION ENGINE ---
        const getRecommendations = (cat: string) => {
            if (cat.includes('Finanzas')) return [
                "• Automatización de conciliación bancaria mediante algoritmos de casación estándar.",
                "• Optimización del cockpit de cierre contable para reducir tiempos de ejecución.",
                "• Implementación de validaciones en tiempo real para reducir errores en asientos manuales."
            ];
            if (cat.includes('Logística')) return [
                "• Revisión del maestro de materiales para asegurar integridad de datos y procesos de reaprovisionamiento.",
                "• Optimización de la gestión de stocks mediante estrategias de picking y ubicación avanzadas.",
                "• Automatización de la verificación de facturas logísticas para reducir discrepancias."
            ];
            if (cat.includes('Producción')) return [
                "• Implementación de grafos y hojas de ruta optimizadas para mejorar la planificación de capacidad.",
                "• Integración de plantas mediante terminales de captura de datos en tiempo real.",
                "• Revisión de controles de calidad integrados en el flujo de materiales."
            ];
            if (cat.includes('Tecnología') || cat.includes('BTP')) return [
                "• Migración de transacciones críticas a SAP Fiori para mejorar la experiencia de usuario y productividad.",
                "• Análisis de rendimiento ABAP y optimización de jobs de fondo recurrentes.",
                "• Revisión de la arquitectura de integraciones mediante SAP Integration Suite."
            ];
            // Default
            return [
                "• Auditoría de procesos: Revisión detallada de los flujos funcionales detectados.",
                "• Corrección técnica / Evolutivo: Implementación de mejoras para prevenir errores recurrentes.",
                "• Formación a Usuarios: Capacitación focalizada para reducir consultas operativas."
            ];
        };

        const recs = getRecommendations(type);

        console.log('[PROPOSAL-SERVER] Creating document...');

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
                                    text: `Fecha: ${formatShortDate(new Date())}`,
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
                        // Limit to max 5 tickets to prevent document overflow
                        ...(insightData.sampleTickets || []).slice(0, 5).map((t: any) =>
                            new Paragraph({
                                text: `• [${t.key}] ${t.summary} (${t.date}) `,
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
                            text: "Para optimizar el servicio en este área, Altim propone seguir las mejores prácticas de SAP mediante:",
                            spacing: { after: 200 }
                        }),
                        ...recs.map(r => new Paragraph({ text: r, spacing: { before: 100 } })),

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
                            text: `Potencial de liberación de capacidad: ~${(insightData.hours * 0.4).toFixed(0)} - ${(insightData.hours * 0.6).toFixed(0)} horas anuales que podrán reinvertirse en proyectos de innovación sin aumentar el presupuesto total.`
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
                                    text: "Altim AM Manager Advisor V1.1",
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

        console.log('[PROPOSAL-SERVER] Document created, converting to base64...');
        const b64 = await Packer.toBase64String(doc);
        console.log('[PROPOSAL-SERVER] Base64 conversion complete, size:', b64.length);

        return {
            success: true,
            data: b64,
            filename: `Propuesta_Optimizacion_${client.name.replace(/\s+/g, '_')}_${type.replace(/\s+/g, '_')}.docx`
        };
    } catch (error: any) {
        console.error("[PROPOSAL-SERVER] Error generating Word proposal:", error);
        return { success: false, error: error.message };
    }
}

export async function generateAnalysisRequestAction(clientId: string, type: string, insightData: any) {
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
                        new Paragraph({
                            text: "SOLICITUD DE ANÁLISIS TÉCNICO-FUNCIONAL",
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 1000, after: 500 }
                        }),
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: `Cliente: ${client.name}`, bold: true }),
                                new TextRun({ text: ` | Área: ${type}`, italics: true })
                            ]
                        }),
                        new Paragraph({
                            text: "PARA: Equipo de Consultoría / SAP Director",
                            spacing: { before: 500, after: 500 }
                        }),
                        new Paragraph({
                            text: "1. Justificación del Sistema (Manager Advisor)",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: insightData.justification,
                            spacing: { after: 300 }
                        }),
                        new Paragraph({
                            text: `Evidencia técnica: ${insightData.count} tickets detectados sumando ${insightData.hours} horas de carga operativa.`,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            text: "2. Casuística de ejemplo",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { after: 200 }
                        }),
                        ...(insightData.sampleTickets || []).map((t: any) =>
                            new Paragraph({
                                text: `• [${t.key}] ${t.summary} (${t.date})`,
                                spacing: { after: 100 }
                            })
                        ),
                        new Paragraph({
                            text: "3. Análisis del Consultor (Espacio para completar)",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 500, after: 1000 }
                        }),
                        new Paragraph({ text: "____________________________________________________________________________" }),
                        new Paragraph({ text: "____________________________________________________________________________" }),
                        new Paragraph({ text: "____________________________________________________________________________" })
                    ]
                }
            ]
        });

        const b64 = await Packer.toBase64String(doc);

        // Trigger notification to manager/consultants
        await notifyProposalRequestAction(clientId, `ANÁLISIS TÉCNICO: ${type}`, insightData);

        return {
            success: true,
            data: b64,
            filename: `Solicitud_Análisis_${client.name.replace(/\s+/g, '_')}_${type.replace(/\s+/g, '_')}.docx`
        };
    } catch (error: any) {
        console.error("Error generating analysis request:", error);
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
