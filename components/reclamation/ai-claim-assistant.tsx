"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sparkles, ShieldCheck, MessageSquarePlus, Loader2, Copy } from "lucide-react";
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
        <div className="space-y-4 py-2 border-t mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg shadow-md">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm italic font-anek tracking-tight">AI Claim Assistant</span>
                </div>

                <div className="flex items-center space-x-3 bg-slate-100/50 p-1.5 rounded-full border border-slate-200 shadow-inner px-3">
                    <Label htmlFor="defense-mode" className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter cursor-pointer">
                        {defenseMode ? "Modo Defensa" : "Modo Objetivo"}
                    </Label>
                    <Switch
                        id="defense-mode"
                        checked={defenseMode}
                        onCheckedChange={setDefenseMode}
                        className="data-[state=checked]:bg-indigo-600"
                    />
                </div>
            </div>

            {!result && !loading && (
                <div className="bg-white border rounded-xl p-6 text-center space-y-3 shadow-sm border-dashed border-slate-300 group hover:border-indigo-400 transition-all cursor-pointer overflow-hidden relative" onClick={handleAnalyze}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="w-6 h-6 text-indigo-500/50 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="text-xs text-slate-500 px-4">Utiliza la IA para analizar los tickets de JIRA involucrados y proponer una respuesta justificada.</p>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 font-bold hover:bg-indigo-50 hover:text-indigo-700"
                    >
                        Pedir Ayuda a IA
                    </Button>
                </div>
            )}

            {loading && (
                <div className="bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center space-y-4 border border-slate-200 shadow-inner">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Brain className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-600 animate-pulse">Analizando tickets de JIRA...</p>
                        <p className="text-[10px] text-slate-400 mt-1">Consultando estados, logs y comentarios</p>
                    </div>
                </div>
            )}

            {result && !loading && (
                <Card className="border-indigo-200 overflow-hidden shadow-lg animate-in zoom-in-95 duration-300">
                    <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center justify-between">
                        <h5 className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Propuesta de Análisis {defenseMode && "(Defensivo)"}
                        </h5>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-400 hover:text-indigo-600" onClick={() => setResult(null)}>
                            <Copy className="w-3 h-3" />
                        </Button>
                    </div>
                    <CardContent className="p-4 space-y-4">
                        <div className="text-xs text-slate-700 leading-relaxed italic border-l-2 border-indigo-200 pl-3">
                            {result.analisis}
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Puntos de apoyo:</p>
                            <ul className="space-y-1">
                                {result.puntosClave.map((pt, i) => (
                                    <li key={i} className="text-[11px] text-slate-600 flex items-start gap-2">
                                        <span className="text-indigo-500 mt-0.5">•</span>
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-slate-900 rounded-lg p-3 relative group">
                            <p className="text-[10px] font-bold text-indigo-400 mb-2 flex items-center gap-1.5 lowercase">
                                <MessageSquarePlus className="w-3 h-3" /> Nota recomendada:
                            </p>
                            <p className="text-[11px] text-indigo-100/90 leading-relaxed font-mono">
                                {result.notaRecomendada}
                            </p>
                            <Button
                                size="sm"
                                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-7 text-[10px] uppercase tracking-wider shadow-lg"
                                onClick={() => onApplyNote(result.notaRecomendada)}
                            >
                                Usar esta nota y completar resolución
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
