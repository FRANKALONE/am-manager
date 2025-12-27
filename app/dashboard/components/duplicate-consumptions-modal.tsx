"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";

interface DuplicateConsumption {
    id: number;
    ticketId: string;
    month: string;
    manualHours: number;
    syncHours: number;
    exactMatch: boolean;
}

interface DuplicateConsumptionsModalProps {
    open: boolean;
    duplicates: DuplicateConsumption[];
    onDelete: (ids: number[]) => Promise<void>;
    onKeep: (ids: number[]) => Promise<void>;
    onClose: () => void;
}

export function DuplicateConsumptionsModal({
    open,
    duplicates,
    onDelete,
    onKeep,
    onClose
}: DuplicateConsumptionsModalProps) {
    const [selected, setSelected] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const toggleSelect = (id: number) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === duplicates.length) {
            setSelected([]);
        } else {
            setSelected(duplicates.map(d => d.id));
        }
    };

    const handleDelete = async () => {
        if (selected.length === 0) {
            alert("Por favor, selecciona al menos un consumo para borrar.");
            return;
        }

        if (!confirm(`¿Seguro que quieres eliminar ${selected.length} consumo(s) manual(es)?`)) {
            return;
        }

        setIsProcessing(true);
        try {
            // Delete selected
            await onDelete(selected);

            // Mark remaining as reviewed
            const remaining = duplicates.filter(d => !selected.includes(d.id)).map(d => d.id);
            if (remaining.length > 0) {
                await onKeep(remaining);
            }

            onClose();
        } catch (error) {
            console.error("Error deleting duplicates:", error);
            alert("Error al eliminar los consumos duplicados.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeepRest = async () => {
        setIsProcessing(true);
        try {
            // Mark non-selected as reviewed
            const toKeep = duplicates.filter(d => !selected.includes(d.id)).map(d => d.id);
            if (toKeep.length > 0) {
                await onKeep(toKeep);
            }
            onClose();
        } catch (error) {
            console.error("Error marking as reviewed:", error);
            alert("Error al marcar los consumos como revisados.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = async () => {
        // Mark ALL as reviewed (implicit approval)
        setIsProcessing(true);
        try {
            const allIds = duplicates.map(d => d.id);
            await onKeep(allIds);
            onClose();
        } catch (error) {
            console.error("Error marking as reviewed:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <DialogTitle>Consumos Manuales Duplicados Detectados</DialogTitle>
                    </div>
                    <DialogDescription>
                        Se han encontrado <strong>{duplicates.length}</strong> consumo(s) manual(es) que coinciden con worklogs sincronizados automáticamente.
                        Selecciona los que deseas eliminar o cierra este diálogo para mantenerlos todos (no se volverán a mostrar).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">
                                    <Checkbox
                                        checked={selected.length === duplicates.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Ticket</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Mes</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-700">Horas Manuales</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-700">Horas Sincronizadas</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-700">Coincidencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {duplicates.map((dup) => (
                                <tr key={dup.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <Checkbox
                                            checked={selected.includes(dup.id)}
                                            onCheckedChange={() => toggleSelect(dup.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">{dup.ticketId}</td>
                                    <td className="px-4 py-2 text-xs">{dup.month}</td>
                                    <td className="px-4 py-2 text-right font-medium">{dup.manualHours}h</td>
                                    <td className="px-4 py-2 text-right font-medium">{dup.syncHours}h</td>
                                    <td className="px-4 py-2 text-center">
                                        {dup.exactMatch ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                ✓ Exacta
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                ≈ Aproximada
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <DialogFooter className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                        {selected.length > 0 ? (
                            <span>{selected.length} seleccionado(s)</span>
                        ) : (
                            <span>Ninguno seleccionado</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleKeepRest}
                            disabled={isProcessing}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mantener Resto
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isProcessing || selected.length === 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Borrar Seleccionados ({selected.length})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
