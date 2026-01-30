"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sparkles, ShieldCheck, MessageSquarePlus, Loader2, Copy, X } from "lucide-react";
import { analyzeReclamationWithAI } from "@/app/actions/ai-assistant";
import { toast } from "sonner";

interface Props {
    requestId: string;
    onApplyNote: (note: string) => void;
}

export function AIClaimAssistant({ requestId, onApplyNote }: Props) {
    const [loading, setLoading] = useState(false);
    const [defenseMode, setDefenseMode] = useState(true);
    const [result, setResult] = useState<{
        analisis: string;
        puntosClave: string[];
        notaRecomendada: string;
    } | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const response = await analyzeReclamationWithAI(requestId, defenseMode);
            if (response.success && response.data) {
                setResult(response.data);
                toast.success("Análisis completado con éxito");
            } else {
                toast.error(response.error || "Error al analizar");
            }
        } catch (error) {
            toast.error("Error técnico al contactar con la IA");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3 py-3 border-y border-slate-100 bg-white/50 px-1 my-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded shadow-sm">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">AI Assistant</span>
                </div>

                <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner px-2">
                    <Label htmlFor="defense-mode" className="text-[9px] uppercase font-bold text-slate-500 cursor-pointer">
                        {defenseMode ? "Defensa" : "Objetivo"}
                    </Label>
                    <Switch
                        id="defense-mode"
                        checked={defenseMode}
                        onCheckedChange={setDefenseMode}
                        className="scale-75 data-[state=checked]:bg-indigo-600"
                    />
                </div>
            </div>

            {!result && !loading && (
                <div
                    className="bg-white border-2 border-dashed border-indigo-100 rounded-lg p-4 text-center hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    onClick={handleAnalyze}
                >
                    <Sparkles className="w-5 h-5 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-[11px] text-slate-500 mb-2">Haz clic para analizar los tickets de JIRA con IA</p>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 font-bold h-7 text-[10px]"
                    >
                        GENERAR ANÁLISIS
                    </Button>
                </div>
            )}

            {loading && (
                <div className="bg-indigo-50/30 rounded-lg p-5 flex flex-col items-center justify-center space-y-3 border border-indigo-100 border-dashed">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <p className="text-[11px] font-bold text-slate-600">Consultando JIRA...</p>
                </div>
            )}

            {result && !loading && (
                <div className="border border-indigo-100 rounded-lg bg-white shadow-sm ring-1 ring-indigo-50">
                    <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 flex items-center justify-between">
                        <h5 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Análisis {defenseMode ? "Defensivo" : ""}
                        </h5>
                        <button className="text-slate-400 hover:text-slate-600" onClick={() => setResult(null)}>
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-3 space-y-3">
                        <div className="text-[11px] text-slate-700 leading-normal bg-slate-50 p-2 rounded border border-slate-100">
                            {result.analisis}
                        </div>

                        <div className="space-y-1">
                            {result.puntosClave.map((pt, i) => (
                                <div key={i} className="text-[10px] text-slate-600 flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold">•</span>
                                    {pt}
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-900 rounded p-3">
                            <p className="text-[9px] font-bold text-indigo-400 mb-1 uppercase tracking-widest">Nota Recomendada:</p>
                            <p className="text-[11px] text-indigo-50 leading-snug mb-3">
                                {result.notaRecomendada}
                            </p>
                            <Button
                                size="sm"
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-7 text-[10px]"
                                onClick={() => onApplyNote(result.notaRecomendada)}
                            >
                                APLICAR NOTA
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
