"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    getReviewRequestDetail,
    approveReviewRequest,
    rejectReviewRequest
} from "@/app/actions/review-requests";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    adminId: string;
    onStatusUpdate: () => void;
}

export function ReviewDetailModal({
    isOpen,
    onClose,
    requestId,
    adminId,
    onStatusUpdate
}: Props) {
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [selectedWlogs, setSelectedWlogs] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen && requestId) {
            setLoading(true);
            setSelectedWlogs([]);
            getReviewRequestDetail(requestId).then(data => {
                setRequest(data);
                if (data) {
                    setNotes(data.reviewNotes || "");
                    if (data.worklogs) {
                        setSelectedWlogs(data.worklogs.map((w: any) => w.id));
                    }
                }
                setLoading(false);
            });
        }
    }, [isOpen, requestId]);

    const toggleWorklog = (id: number) => {
        setSelectedWlogs(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    const handleAction = async (action: 'APPROVE' | 'REJECT') => {
        if (!notes) {
            toast.error("Por favor, introduce una nota explicativa (obligatoria)");
            return;
        }

        if (action === 'APPROVE' && selectedWlogs.length === 0) {
            toast.error("Debes seleccionar al menos una imputación para aprobar");
            return;
        }

        setSubmitting(true);
        try {
            const result = action === 'APPROVE'
                ? await approveReviewRequest(requestId, adminId, notes, selectedWlogs)
                : await rejectReviewRequest(requestId, adminId, notes);

            if (result.success) {
                toast.success(action === 'APPROVE' ? "Reclamación aprobada" : "Reclamación rechazada");
                onStatusUpdate();
                onClose();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isPending = request?.status === "PENDING";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center justify-between">
                        <span>Detalles de la Reclamación</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                            {request?.status}
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        {isPending
                            ? "Revisa las imputaciones y añade tus notas para resolver la reclamación."
                            : "Consulta el histórico de esta reclamación."}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="p-20 text-center text-muted-foreground">Cargando detalles...</div>
                ) : request ? (
                    <>
                        <ScrollArea className="flex-1 p-6 pt-2">
                            <div className="space-y-4">
                                {/* Cabecera de datos compacta */}
                                <div className="grid grid-cols-4 gap-4 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="space-y-0.5">
                                        <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Cliente</p>
                                        <p className="font-bold text-slate-800 truncate">{request.workPackage.clientName}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Work Package</p>
                                        <p className="font-bold text-slate-800 truncate">{request.workPackage.name}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Solicitado por</p>
                                        <p className="font-semibold truncate">{request.requestedByUser.name}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Fecha</p>
                                        <p className="font-semibold">{new Date(request.createdAt).toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>

                                {/* Motivo del cliente */}
                                <div className="p-3 bg-amber-50/30 rounded-lg text-xs italic border border-amber-100 flex gap-2">
                                    <span className="font-bold text-amber-700 not-italic">Motivo:</span>
                                    <span className="text-slate-700">"{request.reason}"</span>
                                </div>

                                {/* Tabla de imputaciones */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-malachite"></span>
                                            IMPUTACIONES RECLAMADAS ({request.worklogs.length})
                                        </span>
                                        {isPending && (
                                            <span className="text-[11px] bg-jade/10 text-jade px-2 py-0.5 rounded-full font-bold">
                                                Total Reclamado: {request.worklogs.reduce((sum: number, w: any) => sum + w.timeSpentHours, 0).toFixed(2)}h
                                            </span>
                                        )}
                                    </h4>
                                    <div className="border rounded-md overflow-hidden bg-white shadow-sm font-anek">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-slate-500 font-semibold italic">
                                                    {isPending && <th className="p-2 text-left w-8"></th>}
                                                    <th className="p-2 text-left">Fecha</th>
                                                    <th className="p-2 text-left">Ticket</th>
                                                    <th className="p-2 text-left">Autor</th>
                                                    <th className="p-2 text-right">Horas</th>
                                                    {!isPending && <th className="p-2 text-center w-24">Estado</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {request.worklogs.map((w: any, i: number) => {
                                                    const isSelected = isPending
                                                        ? selectedWlogs.includes(w.id)
                                                        : request.approvedIds
                                                            ? JSON.parse(request.approvedIds).includes(w.id)
                                                            : (request.status === "APPROVED"); // Default to true for old successful requests

                                                    const isApproved = !isPending && isSelected;
                                                    const isRejected = !isPending && !isSelected && request.status === "APPROVED";

                                                    return (
                                                        <tr
                                                            key={i}
                                                            className={`border-t transition-colors ${isPending
                                                                ? (isSelected ? 'bg-jade/5' : 'bg-slate-50/30')
                                                                : (isApproved ? 'bg-green-50/50' : (isRejected ? 'bg-red-50/30 opacity-60' : 'bg-slate-50/30'))
                                                                }`}
                                                            onClick={() => isPending && toggleWorklog(w.id)}
                                                            style={{ cursor: isPending ? 'pointer' : 'default' }}
                                                        >
                                                            {isPending && (
                                                                <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleWorklog(w.id)}
                                                                        className="rounded border-slate-300 text-jade focus:ring-jade"
                                                                    />
                                                                </td>
                                                            )}
                                                            <td className="p-2 font-medium text-slate-600">{new Date(w.startDate).toLocaleDateString('es-ES')}</td>
                                                            <td className="p-2 font-bold text-slate-900">{w.issueKey}</td>
                                                            <td className="p-2 text-slate-600">{w.author}</td>
                                                            <td className="p-2 text-right font-extrabold text-slate-700">{w.timeSpentHours.toFixed(2)}h</td>
                                                            {!isPending && (
                                                                <td className="p-2 text-center">
                                                                    {isApproved ? (
                                                                        <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">APROBADA</span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">DESCARTADA</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t font-bold">
                                                <tr>
                                                    <td colSpan={isPending ? 3 : 3} className="p-2 text-right text-slate-500">{isPending ? "A Devolver:" : "Total Devuelto:"}</td>
                                                    <td className="p-2 text-right text-jade text-sm">
                                                        {request.worklogs
                                                            .filter((w: any) => {
                                                                if (isPending) return selectedWlogs.includes(w.id);
                                                                return request.approvedIds ? JSON.parse(request.approvedIds).includes(w.id) : false;
                                                            })
                                                            .reduce((sum: number, w: any) => sum + w.timeSpentHours, 0)
                                                            .toFixed(2)}h
                                                    </td>
                                                    {!isPending && <td></td>}
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Pie fijo con Notas y Botones */}
                        <div className="border-t bg-slate-50 p-6 space-y-4 shadow-inner">
                            {isPending ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                Notas de Resolución (Obligatorias)
                                            </label>
                                            {!notes && (
                                                <span className="text-[9px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                    CAMPO REQUERIDO
                                                </span>
                                            )}
                                        </div>
                                        <Textarea
                                            placeholder="Indica aquí el porqué de tu decisión (p.ej: revisado con equipo, error de imputación, etc.)"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className={`min-h-[80px] bg-white text-sm shadow-sm transition-all resize-none ${!notes ? 'border-orange-300 ring-4 ring-orange-500/5' : 'border-slate-200'}`}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleAction('REJECT')}
                                            disabled={submitting || !notes}
                                            className="bg-white text-red-700 hover:bg-red-50 border-red-200 font-semibold"
                                        >
                                            Rechazar
                                        </Button>
                                        <Button
                                            onClick={() => handleAction('APPROVE')}
                                            disabled={submitting || !notes}
                                            className="bg-jade hover:bg-jade-600 text-white font-bold px-10 shadow-lg disabled:opacity-50"
                                        >
                                            {submitting ? "Procesando..." : "Aprobar y Devolver Horas"}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white border rounded p-4 shadow-sm">
                                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Notas de Resolución Guardadas:</h4>
                                    <p className="text-slate-700 text-sm italic leading-relaxed">"{request.reviewNotes || "Sin notas adicionales"}"</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="p-20 text-center text-red-500 font-bold">No se pudo cargar la información de la reclamación.</div>
                )}
            </DialogContent>
        </Dialog>
    );
}
