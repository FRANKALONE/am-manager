"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReviewRequest } from "@/app/actions/review-requests";
import { toast } from "sonner";

interface ReviewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedWorklogs: any[];
    wpId: string;
    userId: string;
    onSuccess: () => void;
}

export function ReviewRequestModal({
    isOpen,
    onClose,
    selectedWorklogs,
    wpId,
    userId,
    onSuccess
}: ReviewRequestModalProps) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.length < 10) {
            toast.error("Por favor, introduce un motivo más detallado (mín. 10 caracteres)");
            return;
        }

        setSubmitting(true);
        try {
            const result = await createReviewRequest(wpId, userId, selectedWorklogs, reason);

            if (result.success) {
                toast.success("Reclamación enviada correctamente");
                onSuccess();
                onClose();
                setReason("");
            } else {
                toast.error(result.error || "Error al enviar la reclamación");
            }
        } catch (error) {
            console.error("Error submitting review request:", error);
            toast.error("Error de conexión al enviar la reclamación");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Solicitar Revisión de Imputaciones</DialogTitle>
                    <DialogDescription>
                        Has seleccionado {selectedWorklogs.length} imputaciones para revisar.
                        Por favor, indica el motivo de tu reclamación.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/30">
                        <table className="w-full text-xs">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-1 text-left">Fecha</th>
                                    <th className="p-1 text-left">Ticket</th>
                                    <th className="p-1 text-right">Horas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedWorklogs.map((w, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="p-1">{new Date(w.startDate).toLocaleDateString('es-ES')}</td>
                                        <td className="p-1 font-medium">{w.issueKey}</td>
                                        <td className="p-1 text-right">{w.timeSpentHours.toFixed(2)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Motivo de la reclamación</label>
                        <Textarea
                            placeholder="Ej: Estas horas corresponden a un proyecto diferente o el tiempo imputado es excesivo..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !reason}>
                        {submitting ? "Enviando..." : "Enviar Reclamación"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
