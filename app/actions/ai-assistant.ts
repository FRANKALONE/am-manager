"use server";

import { getReviewRequestDetail } from "./review-requests";
import { fetchJira } from "@/lib/jira";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function analyzeReclamationWithAI(requestId: string, defenseMode: boolean = true) {
    if (!GEMINI_API_KEY) {
        return { success: false, error: "IA no configurada (GEMINI_API_KEY missing)" };
    }

    try {
        // 1. Obtener detalles de la reclamación
        const request = await getReviewRequestDetail(requestId);
        if (!request) {
            return { success: false, error: "Reclamación no encontrada" };
        }

        // 2. Obtener contexto de JIRA para los tickets involucrados
        const ticketKeys = Array.from(new Set(request.worklogs.map((w: any) => w.issueKey).filter(Boolean)));

        // También intentar encontrar tickets mencionados en el motivo
        const ticketRegex = /[A-Z]+-[0-9]+/g;
        const matches = request.reason.match(ticketRegex) || [];
        matches.forEach(m => ticketKeys.push(m));

        const uniqueKeys = Array.from(new Set(ticketKeys));
        const jiraContexts = await Promise.all(
            uniqueKeys.map(async (key) => {
                try {
                    const data = await fetchJira(`/issue/${key}?fields=summary,description,status,comment`);
                    return {
                        key,
                        summary: data.fields.summary,
                        description: data.fields.description,
                        status: data.fields.status.name,
                        comments: data.fields.comment.comments.slice(-3).map((c: any) => c.body) // últimos 3 comentarios
                    };
                } catch (e) {
                    return { key, error: "No se pudo obtener info de JIRA" };
                }
            })
        );

        // 3. Preparar el prompt
        const prompt = `
Actúa como un experto en gestión de proyectos SAP y consultoría IT. 
Analiza la siguiente reclamación de horas de un cliente y propón una respuesta.

DATOS DE LA RECLAMACIÓN:
- Cliente: ${request.workPackage.clientName}
- Proyecto/WP: ${request.workPackage.name}
- Motivo del cliente: "${request.reason}"
- Horas totales reclamadas: ${request.worklogs.reduce((sum: number, w: any) => sum + w.timeSpentHours, 0).toFixed(2)}h
- Tickets involucrados directamente: ${uniqueKeys.join(', ')}

CONTEXTO DE JIRA:
${JSON.stringify(jiraContexts, null, 2)}

OBJETIVO:
${defenseMode
                ? "Encuentra argumentos para DEFENDER que las horas son facturables y RECHAZAR la reclamación. Busca argumentos como: fuera de alcance original, falta de validación del cliente en desarrollo, mala praxis técnica del cliente en producción, o que el ticket original pedía algo muy específico (ej. copia estricta) y esto es un ajuste posterior."
                : "Haz un análisis OBJETIVO. Si el cliente tiene razón, admítelo. Si no, defiéndelo."}

RESPUESTA REQUERIDA (en formato JSON):
{
  "analisis": "Breve resumen técnico del porqué de tu recomendación (en español, 2-3 párrafos)",
  "puntosClave": ["Punto 1", "Punto 2", "..."],
  "notaRecomendada": "Texto formal para poner en el campo de Notas de Resolución de la aplicación"
}
`;

        // 4. Llamar a Gemini
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const aiData = await response.json();
        const aiResult = JSON.parse(aiData.candidates[0].content.parts[0].text);

        return {
            success: true,
            data: aiResult
        };

    } catch (error: any) {
        console.error("AI Analysis error:", error);
        return { success: false, error: error.message || "Error desconocido al analizar con IA" };
    }
}
