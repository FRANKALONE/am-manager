"use client";

import { addValidityPeriod, updateValidityPeriod, deleteValidityPeriod } from "@/app/actions/work-packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Save, Undo, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";

export function ValidityPeriodsManager({ wpId, periods, scopeUnits, regularizationTypes }: { wpId: string, periods: any[], scopeUnits?: any[], regularizationTypes?: any[] }) {
    const [isPending, startTransition] = useTransition();

    // New period state
    const [newPeriod, setNewPeriod] = useState({
        startDate: "",
        endDate: "",
        totalQuantity: 600,
        rate: 50,
        billingType: "MENSUAL",
        isPremium: false,
        premiumPrice: null as number | null,
        scopeUnit: "HORAS",
        regularizationType: null as string | null,
        regularizationRate: null as number | null,
        renewalType: null as string | null,
        rateEvolutivo: null as number | null
    });

    // Editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPeriod, setEditPeriod] = useState<any>(null);

    function handleAdd() {
        if (!newPeriod.startDate || !newPeriod.endDate) return;
        startTransition(async () => {
            await addValidityPeriod(
                wpId,
                new Date(newPeriod.startDate),
                new Date(newPeriod.endDate),
                newPeriod.totalQuantity,
                newPeriod.rate,
                newPeriod.isPremium,
                newPeriod.premiumPrice,
                newPeriod.scopeUnit,
                newPeriod.regularizationType,
                newPeriod.regularizationRate,
                null, // surplusStrategy removed
                newPeriod.rateEvolutivo
            );
            // Reset form
            setNewPeriod({
                startDate: "",
                endDate: "",
                totalQuantity: 600,
                rate: 50,
                billingType: "MENSUAL",
                isPremium: false,
                premiumPrice: null,
                scopeUnit: "HORAS",
                regularizationType: null,
                regularizationRate: null,
                renewalType: null,
                rateEvolutivo: null
            });
        });
    }

    function startEdit(p: any) {
        setEditingId(p.id);
        setEditPeriod({
            startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : "",
            endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : "",
            totalQuantity: p.totalQuantity || 600,
            rate: p.rate || 50,
            isPremium: p.isPremium || false,
            premiumPrice: p.premiumPrice || null,
            scopeUnit: p.scopeUnit || "HORAS",
            regularizationType: p.regularizationType || null,
            regularizationRate: p.regularizationRate || null,
            surplusStrategy: p.surplusStrategy || null,
            rateEvolutivo: p.rateEvolutivo || null
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditPeriod(null);
    }

    function handleUpdate(id: number) {
        if (!editPeriod.startDate || !editPeriod.endDate) return;
        startTransition(async () => {
            await updateValidityPeriod(
                id,
                new Date(editPeriod.startDate),
                new Date(editPeriod.endDate),
                editPeriod.totalQuantity,
                editPeriod.rate,
                editPeriod.isPremium,
                editPeriod.premiumPrice,
                editPeriod.scopeUnit,
                editPeriod.regularizationType,
                editPeriod.regularizationRate,
                editPeriod.surplusStrategy,
                editPeriod.rateEvolutivo
            );
            setEditingId(null);
            setEditPeriod(null);
        });
    }

    function handleDelete(id: number) {
        if (!confirm("¿Seguro que quieres eliminar este periodo?")) return;
        startTransition(async () => {
            await deleteValidityPeriod(id);
        });
    }

    return (
        <div className="space-y-6">
            {/* Add New Period - FIRST */}
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Añadir Nuevo Periodo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                        <div className="space-y-2">
                            <Label htmlFor="newStartDate">Fecha Inicio</Label>
                            <Input
                                type="date"
                                id="newStartDate"
                                value={newPeriod.startDate}
                                onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newEndDate">Fecha Fin</Label>
                            <Input
                                type="date"
                                id="newEndDate"
                                value={newPeriod.endDate}
                                onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Row 1: Cantidad y Unidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newTotalQuantity">Cantidad de Alcance (TOTAL)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newTotalQuantity"
                                value={newPeriod.totalQuantity}
                                onChange={(e) => setNewPeriod({ ...newPeriod, totalQuantity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newScopeUnit">Unidad de la Cantidad de Alcance</Label>
                            <Select value={newPeriod.scopeUnit} onValueChange={(value) => setNewPeriod({ ...newPeriod, scopeUnit: value })}>
                                <SelectTrigger id="newScopeUnit"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {scopeUnits?.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>


                    {/* Row 2: Tarifa y Tipo Facturación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newRate">Tarifa</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRate"
                                value={newPeriod.rate}
                                onChange={(e) => setNewPeriod({ ...newPeriod, rate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRateEvolutivo">Tarifa de Evolutivos</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRateEvolutivo"
                                value={newPeriod.rateEvolutivo || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, rateEvolutivo: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>

                    {/* Row 2.5: Tipo Facturación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBillingType">Tipo de Facturación</Label>
                            <Select value={newPeriod.billingType || "MENSUAL"} onValueChange={(value) => setNewPeriod({ ...newPeriod, billingType: value })}>
                                <SelectTrigger id="newBillingType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                                    <SelectItem value="ANUAL">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Tarifa Regularización y Tipo Regularización */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newRegularizationRate">Tarifa de Regularización</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRegularizationRate"
                                value={newPeriod.regularizationRate || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, regularizationRate: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder="Misma que tarifa normal"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRegularizationType">Tipo de Regularización</Label>
                            <Select value={newPeriod.regularizationType || "NONE"} onValueChange={(value) => setNewPeriod({ ...newPeriod, regularizationType: value === "NONE" ? null : value })}>
                                <SelectTrigger id="newRegularizationType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">No definido</SelectItem>
                                    {regularizationTypes?.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 4: Premium y Tipo Renovación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newIsPremium">Premium</Label>
                            <Select value={newPeriod.isPremium ? "true" : "false"} onValueChange={(value) => setNewPeriod({ ...newPeriod, isPremium: value === "true" })}>
                                <SelectTrigger id="newIsPremium"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">No</SelectItem>
                                    <SelectItem value="true">Sí</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRenewalType">Tipo de Renovación</Label>
                            <Select value={newPeriod.renewalType || "NONE"} onValueChange={(value) => setNewPeriod({ ...newPeriod, renewalType: value === "NONE" ? null : value })}>
                                <SelectTrigger id="newRenewalType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">No definido</SelectItem>
                                    {/* Note: renewalTypes would need to be passed as prop */}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 5: Tarifa Premium (conditional) */}
                    {newPeriod.isPremium && (
                        <div className="space-y-2">
                            <Label htmlFor="newPremiumPrice">Tarifa de Premium</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newPremiumPrice"
                                value={newPeriod.premiumPrice || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, premiumPrice: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder="Opcional"
                            />
                        </div>
                    )}

                    <Button
                        onClick={handleAdd}
                        disabled={isPending || !newPeriod.startDate || !newPeriod.endDate}
                        type="button"
                        className="w-full"
                    >
                        {isPending ? "Guardando..." : "Añadir Periodo"}
                    </Button>
                </CardContent>
            </Card>

            {/* Existing Periods Table - SECOND */}
            {
                periods.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">Periodo</th>
                                    <th className="px-3 py-2 text-left font-medium">Cantidad</th>
                                    <th className="px-3 py-2 text-left font-medium">Tarifa</th>
                                    <th className="px-3 py-2 text-left font-medium">Premium</th>
                                    <th className="px-3 py-2 text-left font-medium">Regularización</th>
                                    <th className="px-3 py-2 text-left font-medium">Excedente</th>
                                    <th className="px-3 py-2 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {periods.map((p) => {
                                    const isEditing = editingId === p.id;
                                    const data = isEditing ? editPeriod : p;

                                    return (
                                        <tr key={p.id} className={isEditing ? "bg-primary/5" : ""}>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Input type="date" value={data.startDate} onChange={e => setEditPeriod({ ...editPeriod, startDate: e.target.value })} className="text-xs h-7" />
                                                        <Input type="date" value={data.endDate} onChange={e => setEditPeriod({ ...editPeriod, endDate: e.target.value })} className="text-xs h-7" />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{new Date(data.startDate).toLocaleDateString('es-ES')}</div>
                                                        <div className="text-muted-foreground">{new Date(data.endDate).toLocaleDateString('es-ES')}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Input type="number" step="0.01" value={data.totalQuantity} onChange={e => setEditPeriod({ ...editPeriod, totalQuantity: parseFloat(e.target.value) })} className="text-xs h-7" />
                                                        <Select value={data.scopeUnit} onValueChange={(value) => setEditPeriod({ ...editPeriod, scopeUnit: value })}>
                                                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {scopeUnits?.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{data.totalQuantity}</div>
                                                        <div className="text-muted-foreground">{data.scopeUnit}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Input type="number" step="0.01" value={data.rate} onChange={e => setEditPeriod({ ...editPeriod, rate: parseFloat(e.target.value) })} className="text-xs h-7" placeholder="Tarifa" />
                                                        <Input type="number" step="0.01" value={data.rateEvolutivo || ""} onChange={e => setEditPeriod({ ...editPeriod, rateEvolutivo: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder="Tarifa Evo" />
                                                        <Input type="number" step="0.01" value={data.correctionFactor} onChange={e => setEditPeriod({ ...editPeriod, correctionFactor: parseFloat(e.target.value) })} className="text-xs h-7" placeholder="Factor" />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>Tarifa: {data.rate} €/h</div>
                                                        {data.rateEvolutivo && <div className="text-green-600 font-medium">Evo: {data.rateEvolutivo} €/h</div>}
                                                        <div className="text-muted-foreground">x{data.correctionFactor}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Select value={data.isPremium ? "true" : "false"} onValueChange={(value) => setEditPeriod({ ...editPeriod, isPremium: value === "true" })}>
                                                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="false">No</SelectItem>
                                                                <SelectItem value="true">Sí</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {data.isPremium && (
                                                            <Input type="number" step="0.01" value={data.premiumPrice || ""} onChange={e => setEditPeriod({ ...editPeriod, premiumPrice: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder="Precio" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{data.isPremium ? "Sí" : "No"}</div>
                                                        {data.isPremium && data.premiumPrice && <div className="text-muted-foreground">{data.premiumPrice} €</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Select value={data.regularizationType || "NONE"} onValueChange={(value) => setEditPeriod({ ...editPeriod, regularizationType: value === "NONE" ? null : value })}>
                                                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="NONE">-</SelectItem>
                                                                {regularizationTypes?.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input type="number" step="0.01" value={data.regularizationRate || ""} onChange={e => setEditPeriod({ ...editPeriod, regularizationRate: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder="Tarifa Reg." />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{data.regularizationType || "-"}</div>
                                                        {data.regularizationRate && <div className="text-muted-foreground">{data.regularizationRate} €/h</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <Select value={data.surplusStrategy || "NONE"} onValueChange={(value) => setEditPeriod({ ...editPeriod, surplusStrategy: value === "NONE" ? null : value })}>
                                                        <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NONE">-</SelectItem>
                                                            <SelectItem value="ACCUMULATE">Acumular</SelectItem>
                                                            <SelectItem value="LOSE">Perder</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="text-xs">{data.surplusStrategy || "-"}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-1 justify-end">
                                                    {isEditing ? (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleUpdate(p.id)} type="button">
                                                                <Save className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500" onClick={cancelEdit} type="button">
                                                                <Undo className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)} type="button">
                                                                <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(p.id)} type="button">
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {
                periods.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 border rounded-md">
                        Sin periodos definidos. Añade el primer periodo arriba.
                    </div>
                )
            }
        </div >
    );
}
