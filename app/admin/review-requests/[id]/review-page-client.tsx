"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CheckCircle2, XCircle, Trash2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getReviewRequestDetail, approveReviewRequest, rejectReviewRequest, deleteReviewRequest } from "@/app/actions/review-requests";
import { toast } from "sonner";
import { formatDate } from "@/lib/date-utils";
import { AIClaimAssistant } from "@/components/reclamation/ai-claim-assistant";

interface Props {
    requestId: string;
    adminId: string;
    userRole: string;
}

export function ReviewPageClient({ requestId, adminId, userRole }: Props) {
    const router = useRouter();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState("");
    const [selectedWlogs, setSelectedWlogs] = useState<number[]>([]);

    useEffect(() => {
        if (requestId) {
            fetchRequestDetail();
        }
    }, [requestId]);

    const fetchRequestDetail = async () => {
        setLoading(true);
        try {
            const data = await getReviewRequestDetail(requestId);
            if (!data) {
                toast.error("Reclamación no encontrada");
                router.push("/admin/review-requests");
                return;
            }
            setRequest(data);
            setNotes(data.reviewNotes || "");
            if (data.status === "PENDING") {
                setSelectedWlogs(data.worklogs.map((w: any) => w.id));
            }
        } catch (error) {
            toast.error("Error al cargar los detalles");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'APPROVE' | 'REJECT' | 'DELETE') => {
        if (!notes && action !== 'DELETE') {
            toast.error("Debes incluir notas de resolución");
            return;
        }

        setSubmitting(true);
        try {
            let res;
            if (action === 'APPROVE') {
                res = await approveReviewRequest(requestId, adminId, notes, selectedWlogs);
            } else if (action === 'REJECT') {
                res = await rejectReviewRequest(requestId, adminId, notes);
            } else {
                res = await deleteReviewRequest(requestId);
            }

            if (res.success) {
                toast.success("Operación completada");
                router.push("/admin/review-requests");
                router.refresh();
            } else {
                toast.error(res.error || "Error al procesar");
            }
        } catch (error) {
            toast.error("Error en la solicitud");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleWorklog = (id: number) => {
        setSelectedWlogs(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Clock className="w-8 h-8 animate-spin text-jade" />
                <p className="text-slate-500 font-medium">Cargando reclamación...</p>
            </div>
        );
    }

    if (!request) return null;

    const isPending = request.status === "PENDING";

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header / Navegación */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin/review-requests")}
                    className="text-slate-500"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver al listado
                </Button>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPending ? 'bg-amber-100 text-amber-700' :
                    request.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {request.status}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda: Detalles e Imputaciones */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-dark-green uppercase">
                                <Clock className="w-5 h-5" /> Detalles de la Reclamación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Cliente</p>
                                    <p className="font-bold text-slate-800">{request.workPackage.clientName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Work Package</p>
                                    <p className="font-bold text-slate-800">{request.workPackage.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Solicitado por</p>
                                    <p className="font-semibold text-slate-700">{request.requestedByUser.name} {request.requestedByUser.surname}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Fecha de Solicitud</p>
                                    <p className="font-semibold text-slate-700">{formatDate(request.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                                <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Motivo del Cliente:</p>
                                <p className="text-sm italic text-slate-700 leading-relaxed">"{request.reason}"</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 uppercase tracking-tight">
                                        <span className="w-2 h-2 rounded-full bg-malachite"></span>
                                        Imputaciones Reclamadas ({request.worklogs.length})
                                    </span>
                                    {isPending && (
                                        <span className="text-[11px] bg-jade/10 text-jade px-2 py-0.5 rounded-full font-bold">
                                            Total: {request.worklogs.reduce((sum: number, w: any) => sum + w.timeSpentHours, 0).toFixed(2)}h
                                        </span>
                                    )}
                                </h4>

                                <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                                                {isPending && <th className="p-3 text-left w-10"></th>}
                                                <th className="p-3 text-left">Fecha</th>
                                                <th className="p-3 text-left">Ticket</th>
                                                <th className="p-3 text-left">Autor</th>
                                                <th className="p-3 text-right">Horas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {request.worklogs.map((w: any, i: number) => {
                                                const isSelected = isPending ? selectedWlogs.includes(w.id) : true;
                                                return (
                                                    <tr
                                                        key={i}
                                                        className={`border-t transition-colors ${isPending && isSelected ? 'bg-jade/5' : ''}`}
                                                        onClick={() => isPending && toggleWorklog(w.id)}
                                                        style={{ cursor: isPending ? 'pointer' : 'default' }}
                                                    >
                                                        {isPending && (
                                                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleWorklog(w.id)}
                                                                    className="rounded border-slate-300 text-jade focus:ring-jade"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="p-3 text-slate-600">{formatDate(w.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                                        <td className="p-3 font-bold text-slate-900">{w.issueKey}</td>
                                                        <td className="p-3 text-slate-600">{w.author}</td>
                                                        <td className="p-3 text-right font-bold text-slate-800">{w.timeSpentHours.toFixed(2)}h</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t font-bold">
                                            <tr>
                                                <td colSpan={isPending ? 4 : 3} className="p-3 text-right text-slate-500 uppercase text-[10px]">
                                                    {isPending ? "A Devolver:" : "Total Reclamado:"}
                                                </td>
                                                <td className="p-3 text-right text-jade text-base tabular-nums">
                                                    {request.worklogs
                                                        .filter((w: any) => isPending ? selectedWlogs.includes(w.id) : true)
                                                        .reduce((sum: number, w: any) => sum + w.timeSpentHours, 0)
                                                        .toFixed(2)}h
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha: IA y Resolución */}
                <div className="space-y-6">
                    {/* Asistente de IA */}
                    <Card className="border-indigo-100 shadow-indigo-100/20 shadow-lg">
                        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50/50 to-white border-b border-indigo-50">
                            <CardTitle className="text-xs font-black uppercase text-indigo-700 flex items-center gap-2 tracking-widest">
                                <Sparkles className="w-4 h-4" /> AI Research Assistant
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <AIClaimAssistant
                                requestId={requestId}
                                onApplyNote={(note) => setNotes(note)}
                            />
                        </CardContent>
                    </Card>

                    {/* Resolución */}
                    <Card className={isPending ? "border-orange-100 shadow-orange-100/20 shadow-lg" : ""}>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Resolución Final
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {isPending ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Notas de Resolución (Obligatorio)</Label>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Detalla aquí la justificación de tu decisión..."
                                            className={`min-h-[150px] resize-none text-sm transition-all focus:ring-4 focus:ring-jade/5 ${!notes ? 'border-orange-200 bg-orange-50/10' : 'border-slate-200'}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button
                                            onClick={() => handleAction('APPROVE')}
                                            disabled={submitting || !notes}
                                            className="bg-jade hover:bg-jade-600 text-white font-bold h-11 shadow-md shadow-jade/10"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            {submitting ? "Procesando..." : "Aprobar Reclamación"}
                                        </Button>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleAction('REJECT')}
                                                disabled={submitting || !notes}
                                                className="border-red-200 text-red-600 hover:bg-red-50 h-10 font-bold"
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Rechazar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    if (confirm("¿Eliminar permanentemente?")) handleAction('DELETE')
                                                }}
                                                disabled={submitting}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-10"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Notas guardadas:</p>
                                        <p className="text-sm italic text-slate-700">"{request.reviewNotes || "Sin notas adicionales"}"</p>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg text-slate-500 text-[11px] justify-center">
                                        <CheckCircle2 className="w-4 h-4" /> Resuelto por {request.reviewedByUser?.name || 'Sistema'} el {formatDate(request.reviewedAt, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
