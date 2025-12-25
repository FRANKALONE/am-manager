"use client";

import { createRegularization, deleteRegularization } from "@/app/actions/regularizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

export function RegularizationManager({ wpId, regularizations }: { wpId: string, regularizations: any[] }) {
    const [isPending, startTransition] = useTransition();

    // Form State
    const [date, setDate] = useState("");
    const [type, setType] = useState("EXCESS");
    const [quantity, setQuantity] = useState("");
    const [description, setDescription] = useState("");

    function handleAdd() {
        if (!date || !quantity) return;
        startTransition(async () => {
            await createRegularization({
                workPackageId: wpId,
                date: new Date(date),
                type: type as "EXCESS" | "RETURN" | "MANUAL_CONSUMPTION" | "SOBRANTE_ANTERIOR",
                quantity: parseFloat(quantity),
                description
            });
            // Reset form
            setDate("");
            setQuantity("");
            setDescription("");
        });
    }

    function handleDelete(id: number) {
        if (!confirm("¿Eliminar regularización?")) return;
        startTransition(async () => {
            await deleteRegularization(id);
        });
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cantidad (h)</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {regularizations.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.type === 'EXCESS'
                                        ? 'border-transparent bg-red-100 text-red-800'
                                        : 'border-transparent bg-green-100 text-green-800'
                                        }`}>
                                        {r.type === 'EXCESS' ? 'Exceso Consumo' : 'Devolución/Anulación'}
                                    </span>
                                </TableCell>
                                <TableCell>{r.quantity}</TableCell>
                                <TableCell>{r.description}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(r.id)} type="button">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {regularizations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">Sin regularizaciones</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-4 items-end bg-muted/30 p-4 rounded-md md:grid-cols-5">
                <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option value="EXCESS">Exceso Consumo</option>
                        <option value="RETURN">Devolución / Anulación</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-1">
                    <Label>Descripción</Label>
                    <Input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivo..." />
                </div>
                <Button
                    variant="secondary"
                    onClick={handleAdd}
                    disabled={isPending || !date || !quantity}
                    type="button"
                >
                    Añadir Reg.
                </Button>
            </div>
        </div>
    );
}
