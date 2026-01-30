"use server";

import { getReviewRequestDetail } from "./review-requests";
import { fetchJira } from "@/lib/jira";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

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

        // 4. Llamar a Gemini con fallback y diagnóstico
        const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
        let lastError = "";

        for (const modelId of modelsToTry) {
            try {
                const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json"
                        }
                    }),
                });

                if (response.ok) {
                    const aiData = await response.json();
                    let text = aiData.candidates[0].content.parts[0].text;
                    // Limpiar posible formato markdown si la IA lo incluye
                    text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
                    const aiResult = JSON.parse(text);
                    return { success: true, data: aiResult };
                }

                const errorData = await response.json().catch(() => ({}));
                lastError = errorData.error?.message || `Error ${response.status}`;
                console.error(`Gemini trial for ${modelId} failed:`, lastError);

                if (response.status !== 404) break;
            } catch (e: any) {
                lastError = e.message;
            }
        }

        // Si fallan todos, intentamos listar modelos para el diagnóstico final
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();
            const available = listData.models?.map((m: any) => m.name.split('/').pop()).join(', ') || "Ninguno";
            throw new Error(`Modelos probados no encontrados. Disponibles para tu clave: ${available}`);
        } catch (diagError: any) {
            throw new Error(`Gemini API error: ${lastError}. (Diagnóstico: ${diagError.message})`);
        }

    } catch (error: any) {
        console.error("AI Analysis error:", error);
        return { success: false, error: error.message || "Error desconocido al analizar con IA" };
    }
}
