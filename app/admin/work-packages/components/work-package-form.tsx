"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateWorkPackage } from "@/app/actions/work-packages";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { formatShortDate } from "@/lib/date-utils";

// Prevent scroll wheel from changing number inputs
const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
};

// Submit Button Component to handle pending state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar Cambios"}
        </Button>
    );
}

// Premium Field Component with reactive Tarifa Premium
function PremiumField({ isPremium, premiumPrice, renewalTypes, defaultRenewalType, renewalNotes }: any) {
    const [showPremiumPrice, setShowPremiumPrice] = useState(isPremium);

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="isPremium">Premium</Label>
                    <Select
                        name="isPremium"
                        defaultValue={isPremium ? "true" : "false"}
                        onValueChange={(value) => setShowPremiumPrice(value === "true")}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="true">Sí</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="renewalType">Tipo de Renovación</Label>
                    <Select name="renewalType" defaultValue={defaultRenewalType}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                            {renewalTypes.map((t: any) => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Notas para Renovaciones */}
            <div className="space-y-2">
                <Label htmlFor="renewalNotes">Notas para Renovaciones</Label>
                <Textarea
                    id="renewalNotes"
                    name="renewalNotes"
                    defaultValue={renewalNotes || ""}
                    placeholder="Notas o consideraciones para futuras renovaciones"
                    rows={3}
                    className="resize-none"
                />
            </div>

            {/* Tarifa Premium (conditional) */}
            {showPremiumPrice && (
                <div className="space-y-2">
                    <Label htmlFor="premiumPrice">Tarifa de Premium</Label>
                    <Input
                        id="premiumPrice"
                        name="premiumPrice"
                        type="number"
                        step="0.01"
                        defaultValue={premiumPrice || ""}
                        placeholder="Opcional"
                        onWheel={preventScrollChange}
                    />
                </div>
            )}
        </>
    );
}

const initialState = {
    error: "",
    message: ""
};

type Props = {
    wp: any;
    contractTypes: any[];
    billingTypes: any[];
    renewalTypes: any[];
    regularizationTypes: any[];
    scopeUnits: any[];
    returnTo?: string;
};

export function WorkPackageForm({ wp, contractTypes, billingTypes, renewalTypes, regularizationTypes, scopeUnits, returnTo }: Props) {
    const updateAction = updateWorkPackage.bind(null, wp.id);
    const [state, formAction] = useFormState(updateAction, initialState);

    // Get current period (first one)
    const currentPeriod = wp.validityPeriods?.[0];

    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="returnUrl" value={returnTo} />

            {/* Error display */}
            {state?.error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            {/* SECTION 1: Header Data (WP Level) */}
            <Card>
                <CardHeader>
                    <CardTitle>Datos de Cabecera del Work Package</CardTitle>
                    <CardDescription>Información general del WP que se mantiene a través de todos los periodos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="id">ID de WP</Label>
                            <Input id="id" name="id" defaultValue={wp.id} required maxLength={20} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre WP</Label>
                            <Input id="name" name="name" defaultValue={wp.name} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contractType">Tipo de Contrato</Label>
                        <Select name="contractType" defaultValue={wp.contractType}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                                {contractTypes.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jiraProjectKeys">Clave de Proyecto en JIRA</Label>
                        <Input
                            id="jiraProjectKeys"
                            name="jiraProjectKeys"
                            defaultValue={wp.jiraProjectKeys || ""}
                            placeholder="Ej: PROJ1, PROJ2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="oldWpId">ID de WP Antiguo</Label>
                        <Input
                            id="oldWpId"
                            name="oldWpId"
                            defaultValue={wp.oldWpId || ""}
                            placeholder="Referencia al WP anterior"
                            maxLength={20}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tempoAccountId">Tempo Account ID</Label>
                        <Input
                            id="tempoAccountId"
                            name="tempoAccountId"
                            defaultValue={wp.tempoAccountId || ""}
                            placeholder="ID interno de Tempo"
                        />
                    </div>

                    {/* IAAS Service and Evolutivos configuration - available for all contract types */}
                    <div className="space-y-4 pt-2 border-t mt-4">
                        <h3 className="text-sm font-medium">Configuración de Consumo</h3>

                        <div className="space-y-2">
                            <Label htmlFor="includedTicketTypes">Tipos de Ticket Consumibles</Label>
                            <Input
                                id="includedTicketTypes"
                                name="includedTicketTypes"
                                defaultValue={wp.includedTicketTypes || ""}
                                placeholder="Ej: Incidencia, Consulta, Soporte AM"
                            />
                            <p className="text-[10px] text-muted-foreground">Separar por comas. Si se deja vacío se usará la configuración global.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="hasIaasService"
                                    name="hasIaasService"
                                    title="Incluir IAAS"
                                    aria-label="Incluir IAAS"
                                    defaultChecked={wp.hasIaasService || false}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="hasIaasService" className="font-normal cursor-pointer text-xs">
                                    Incluir IAAS
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="includeEvoEstimates"
                                    name="includeEvoEstimates"
                                    title="Evolutivos Bolsa (Estimados)"
                                    aria-label="Evolutivos Bolsa (Estimados)"
                                    defaultChecked={wp.includeEvoEstimates ?? true}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="includeEvoEstimates" className="font-normal cursor-pointer text-xs">
                                    Evolutivos Bolsa (Estimados)
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="includeEvoTM"
                                    name="includeEvoTM"
                                    title="Evolutivos T&M (Horas)"
                                    aria-label="Evolutivos T&M (Horas)"
                                    defaultChecked={wp.includeEvoTM ?? true}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="includeEvoTM" className="font-normal cursor-pointer text-xs">
                                    Evolutivos T&M (Horas)
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isMainWP"
                                    name="isMainWP"
                                    title="WP PRINCIPAL"
                                    aria-label="WP PRINCIPAL"
                                    defaultChecked={wp.isMainWP || false}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="isMainWP" className="font-bold cursor-pointer text-xs text-green-600">
                                    WP PRINCIPAL
                                </Label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t mt-4">
                            <SubmitButton />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: Period-Dependent Data - INFORMATIONAL SUMMARY */}
            <Card className="bg-slate-50/50 border-slate-200">
                <CardHeader className="pb-3 text-slate-500">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Resumen del Periodo Vigente</span>
                        <span className="text-xs font-normal px-2 py-1 bg-slate-100 rounded-full border">Solo Consulta</span>
                    </CardTitle>
                    <CardDescription>Parámetros económicos y de gestión actuales. Para editar, desplázate a "Gestión de Periodos de Validez".</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {currentPeriod ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Vigencia */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Vigencia y Alcance</h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Fechas del Periodo</p>
                                        <p className="text-sm font-medium">
                                            {currentPeriod.startDate ? formatShortDate(currentPeriod.startDate) : '-'}
                                            <span className="mx-2 text-muted-foreground">→</span>
                                            {currentPeriod.endDate ? formatShortDate(currentPeriod.endDate) : '-'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cantidad Total</p>
                                            <p className="text-sm font-bold text-primary">{currentPeriod.totalQuantity || 0} {currentPeriod.scopeUnit || 'HORAS'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tarifas */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Condiciones Económicas</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tarifa Standard</p>
                                            <p className="text-sm font-semibold">{currentPeriod.rate || 0} €/h</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tarifa Evolutivos</p>
                                            <p className="text-sm font-medium">{currentPeriod.rateEvolutivo ? `${currentPeriod.rateEvolutivo} €/h` : 'Inc. en Standard'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Facturación</p>
                                            <p className="text-sm font-medium">{wp.billingType || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Premium</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-2 w-2 rounded-full ${currentPeriod.isPremium ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                                <p className="text-sm font-medium">{currentPeriod.isPremium ? 'Habilitado' : 'No'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {currentPeriod.isPremium && (
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tarifa Premium</p>
                                            <p className="text-sm font-bold text-amber-600">{currentPeriod.premiumPrice} €</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Gestión */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Gestión y Exceso</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Regularización</p>
                                            <p className="text-sm font-medium">{currentPeriod.regularizationType || 'Ninguna'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tarifa Reg.</p>
                                            <p className="text-sm font-medium">{currentPeriod.regularizationRate ? `${currentPeriod.regularizationRate} €/h` : 'Estándar'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Estrategia de Exceso</p>
                                        <p className="text-sm font-medium bg-white border px-2 py-0.5 rounded shadow-sm inline-block">
                                            {currentPeriod.surplusStrategy || 'No definida'}
                                        </p>
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Renovación</p>
                                        <p className="text-xs italic text-slate-500">{wp.renewalType || 'No definida'}</p>
                                    </div>
                                </div>
                            </div>

                            {wp.renewalNotes && (
                                <div className="col-span-full bg-white p-3 rounded border border-dashed text-sm">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Notas de Renovación</p>
                                    <p className="text-slate-600 italic whitespace-pre-wrap">{wp.renewalNotes}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8 italic">
                            No hay información de periodo vigente para mostrar
                        </div>
                    )}
                </CardContent>
            </Card>
        </form>
    );
}
