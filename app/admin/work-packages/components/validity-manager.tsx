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
import { useTranslations } from "@/lib/use-translations";
import { formatDate as formatTimezoneDate } from "@/lib/date-utils";

export function ValidityPeriodsManager({ wpId, periods, scopeUnits, regularizationTypes }: { wpId: string, periods: any[], scopeUnits?: any[], regularizationTypes?: any[] }) {
    const { t, locale } = useTranslations();
    const [isPending, startTransition] = useTransition();

    // New period state
    const [newPeriod, setNewPeriod] = useState({
        startDate: "",
        endDate: "",
        totalQuantity: 0,
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
                newPeriod.rateEvolutivo,
                newPeriod.billingType
            );
            // Reset form
            setNewPeriod({
                startDate: "",
                endDate: "",
                totalQuantity: 0,
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
            totalQuantity: p.totalQuantity || 0,
            rate: p.rate || 50,
            isPremium: p.isPremium || false,
            premiumPrice: p.premiumPrice || null,
            scopeUnit: p.scopeUnit || "HORAS",
            regularizationType: p.regularizationType || null,
            regularizationRate: p.regularizationRate || null,
            surplusStrategy: p.surplusStrategy || null,
            rateEvolutivo: p.rateEvolutivo || null,
            billingType: p.billingType || "MENSUAL"
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
                editPeriod.rateEvolutivo,
                editPeriod.billingType
            );
            setEditingId(null);
            setEditPeriod(null);
        });
    }

    function handleDelete(id: number) {
        if (!confirm(t('workPackages.validity.confirmDelete'))) return;
        startTransition(async () => {
            await deleteValidityPeriod(id);
        });
    }

    const formatDate = (dateStr: string) => {
        return formatTimezoneDate(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    return (
        <div className="space-y-6">
            {/* Add New Period - FIRST */}
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {t('workPackages.validity.addTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                        <div className="space-y-2">
                            <Label htmlFor="newStartDate">{t('workPackages.validity.startDate')}</Label>
                            <Input
                                type="date"
                                id="newStartDate"
                                value={newPeriod.startDate}
                                onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newEndDate">{t('workPackages.validity.endDate')}</Label>
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
                            <Label htmlFor="newTotalQuantity">{t('workPackages.validity.scopeQuantity')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newTotalQuantity"
                                value={newPeriod.totalQuantity}
                                onChange={(e) => setNewPeriod({ ...newPeriod, totalQuantity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newScopeUnit">{t('workPackages.validity.scopeUnit')}</Label>
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
                            <Label htmlFor="newRate">{t('workPackages.validity.rate')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRate"
                                value={newPeriod.rate}
                                onChange={(e) => setNewPeriod({ ...newPeriod, rate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRateEvolutivo">{t('workPackages.validity.rateEvolutivo')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRateEvolutivo"
                                value={newPeriod.rateEvolutivo || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, rateEvolutivo: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder={t('workPackages.validity.rateEvolutivoPlaceholder')}
                            />
                        </div>
                    </div>

                    {/* Row 2.5: Tipo Facturación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBillingType">{t('workPackages.validity.billingType')}</Label>
                            <Select value={newPeriod.billingType || "MENSUAL"} onValueChange={(value) => setNewPeriod({ ...newPeriod, billingType: value })}>
                                <SelectTrigger id="newBillingType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MENSUAL">{t('workPackages.validity.billingOptions.monthly')}</SelectItem>
                                    <SelectItem value="TRIMESTRAL">{t('workPackages.validity.billingOptions.quarterly')}</SelectItem>
                                    <SelectItem value="ANUAL">{t('workPackages.validity.billingOptions.annual')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Tarifa Regularización y Tipo Regularización */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newRegularizationRate">{t('workPackages.validity.regRate')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newRegularizationRate"
                                value={newPeriod.regularizationRate || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, regularizationRate: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder={t('workPackages.validity.regRatePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRegularizationType">{t('workPackages.validity.regType')}</Label>
                            <Select value={newPeriod.regularizationType || "NONE"} onValueChange={(value) => setNewPeriod({ ...newPeriod, regularizationType: value === "NONE" ? null : value })}>
                                <SelectTrigger id="newRegularizationType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">{t('workPackages.validity.notDefined')}</SelectItem>
                                    {regularizationTypes?.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 4: Premium y Tipo Renovación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newIsPremium">{t('workPackages.validity.premium')}</Label>
                            <Select value={newPeriod.isPremium ? "true" : "false"} onValueChange={(value) => setNewPeriod({ ...newPeriod, isPremium: value === "true" })}>
                                <SelectTrigger id="newIsPremium"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">{t('common.no')}</SelectItem>
                                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRenewalType">{t('workPackages.validity.renewalType')}</Label>
                            <Select value={newPeriod.renewalType || "NONE"} onValueChange={(value) => setNewPeriod({ ...newPeriod, renewalType: value === "NONE" ? null : value })}>
                                <SelectTrigger id="newRenewalType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">{t('workPackages.validity.notDefined')}</SelectItem>
                                    {/* Note: renewalTypes would need to be passed as prop if we wanted the full list here, 
                                        but currently this component seems to handle a subset or just 'No definido' */}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 5: Tarifa Premium (conditional) */}
                    {newPeriod.isPremium && (
                        <div className="space-y-2">
                            <Label htmlFor="newPremiumPrice">{t('workPackages.validity.premiumPrice')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                id="newPremiumPrice"
                                value={newPeriod.premiumPrice || ""}
                                onChange={(e) => setNewPeriod({ ...newPeriod, premiumPrice: e.target.value ? parseFloat(e.target.value) : null })}
                                placeholder={t('workPackages.validity.premiumPricePlaceholder')}
                            />
                        </div>
                    )}

                    <Button
                        onClick={handleAdd}
                        disabled={isPending || !newPeriod.startDate || !newPeriod.endDate}
                        type="button"
                        className="w-full"
                    >
                        {isPending ? t('workPackages.validity.saving') : t('workPackages.validity.saveButton')}
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
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.period')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.quantity')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.rate')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.premium')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.regularization')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.billingType')}</th>
                                    <th className="px-3 py-2 text-left font-medium">{t('workPackages.validity.tableHeader.surplus')}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t('workPackages.validity.tableHeader.actions')}</th>
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
                                                        <div>{formatDate(data.startDate)}</div>
                                                        <div className="text-muted-foreground">{formatDate(data.endDate)}</div>
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
                                                        <Input type="number" step="0.01" value={data.rate} onChange={e => setEditPeriod({ ...editPeriod, rate: parseFloat(e.target.value) })} className="text-xs h-7" placeholder={t('workPackages.validity.rate')} />
                                                        <Input type="number" step="0.01" value={data.rateEvolutivo || ""} onChange={e => setEditPeriod({ ...editPeriod, rateEvolutivo: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder={t('workPackages.validity.rateEvolutivo')} />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{t('workPackages.validity.rate')}: {data.rate} €/h</div>
                                                        {data.rateEvolutivo && <div className="text-green-600 font-medium">{t('workPackages.validity.rateEvolutivo')}: {data.rateEvolutivo} €/h</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <div className="space-y-1">
                                                        <Select value={data.isPremium ? "true" : "false"} onValueChange={(value) => setEditPeriod({ ...editPeriod, isPremium: value === "true" })}>
                                                            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="false">{t('common.no')}</SelectItem>
                                                                <SelectItem value="true">{t('common.yes')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {data.isPremium && (
                                                            <Input type="number" step="0.01" value={data.premiumPrice || ""} onChange={e => setEditPeriod({ ...editPeriod, premiumPrice: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder={t('workPackages.validity.premiumPrice')} />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs">
                                                        <div>{data.isPremium ? t('common.yes') : t('common.no')}</div>
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
                                                        <Input type="number" step="0.01" value={data.regularizationRate || ""} onChange={e => setEditPeriod({ ...editPeriod, regularizationRate: e.target.value ? parseFloat(e.target.value) : null })} className="text-xs h-7" placeholder={t('workPackages.validity.regRate')} />
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
                                                    <Select value={data.billingType || "MENSUAL"} onValueChange={(value) => setEditPeriod({ ...editPeriod, billingType: value })}>
                                                        <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="MENSUAL">{t('workPackages.validity.billingOptions.monthly')}</SelectItem>
                                                            <SelectItem value="TRIMESTRAL">{t('workPackages.validity.billingOptions.quarterly')}</SelectItem>
                                                            <SelectItem value="ANUAL">{t('workPackages.validity.billingOptions.annual')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="text-xs">
                                                        {data.billingType || "MENSUAL"}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isEditing ? (
                                                    <Input
                                                        type="text"
                                                        value={data.surplusStrategy || ""}
                                                        onChange={e => setEditPeriod({ ...editPeriod, surplusStrategy: e.target.value || null })}
                                                        className="text-xs h-7"
                                                        placeholder="Ej: 3_meses"
                                                    />
                                                ) : (
                                                    <div className="text-xs">
                                                        {data.surplusStrategy || "-"}
                                                    </div>
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
                        {t('workPackages.validity.noPeriods')}
                    </div>
                )
            }
        </div >
    );
}
