"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addWPCorrection, deleteWPCorrection } from "@/app/actions/corrections";
import { Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
    wpId: string;
    corrections: any[];
    models: any[];
};

export function CorrectionManager({ wpId, corrections, models }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Form State
    const [modelId, setModelId] = useState(models.length > 0 ? models[0].id : "");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const handleAdd = () => {
        if (!modelId || !startDate) return;

        startTransition(async () => {
            const result = await addWPCorrection(
                wpId,
                parseInt(modelId.toString()),
                new Date(startDate),
                endDate ? new Date(endDate) : undefined
            );
            if (result.success) {
                setStartDate("");
                setEndDate("");
                router.refresh();
            }
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("¿Eliminar asignación?")) return;
        startTransition(async () => {
            const result = await deleteWPCorrection(id, wpId);
            if (result.success) {
                router.refresh();
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Factores de Corrección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Form to Add New */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-md">
                    <div className="space-y-2">
                        <Label>Modelo</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={modelId}
                            onChange={(e) => setModelId(e.target.value)}
                        >
                            {models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Desde</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Hasta (Opcional)</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={isPending || !startDate}>
                        <Plus className="w-4 h-4 mr-2" /> Asignar
                    </Button>
                </div>

                {/* List */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Inicio</TableHead>
                                <TableHead>Fin</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {corrections.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.correctionModel.name}</TableCell>
                                    <TableCell>{new Date(c.startDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString() : "Indefinido"}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} disabled={isPending}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {corrections.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No hay modelos asignados. Se usará el 'Default' o Factor 1.0 si no hay coincidencias.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
