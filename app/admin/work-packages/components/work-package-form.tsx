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
import { useState } from "react";

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
function PremiumField({ isPremium, premiumPrice, renewalTypes, defaultRenewalType }: any) {
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
};

export function WorkPackageForm({ wp, contractTypes, billingTypes, renewalTypes, regularizationTypes, scopeUnits }: Props) {
    const updateAction = updateWorkPackage.bind(null, wp.id);
    const [state, formAction] = useFormState(updateAction, initialState);

    // Get current period (first one)
    const currentPeriod = wp.validityPeriods?.[0];

    return (
        <div className="space-y-6">
            {/* SECTION 1: General Data */}
            <Card>
                <CardHeader>
                    <CardTitle>Datos Generales</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                                {state.error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre WP</Label>
                            <Input id="name" name="name" defaultValue={wp.name} required />
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="hasIaasService"
                                        name="hasIaasService"
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
                                        defaultChecked={wp.includeEvoTM ?? true}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="includeEvoTM" className="font-normal cursor-pointer text-xs">
                                        Evolutivos T&M (Horas)
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <SubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* SECTION 2: Current Period Data - ALL EDITABLE */}
            <Card>
                <CardHeader>
                    <CardTitle>Datos del Periodo Vigente</CardTitle>
                    <CardDescription>Condiciones económicas y de gestión del periodo actual - Edita aquí o en la sección de Periodos de Validez</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-6">
                        {/* Row 0: Fechas del Periodo */}
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                            <div className="space-y-2">
                                <Label htmlFor="periodStartDate">Fecha Inicio</Label>
                                <Input
                                    id="periodStartDate"
                                    name="periodStartDate"
                                    type="date"
                                    defaultValue={currentPeriod?.startDate ? new Date(currentPeriod.startDate).toISOString().split('T')[0] : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="periodEndDate">Fecha Fin</Label>
                                <Input
                                    id="periodEndDate"
                                    name="periodEndDate"
                                    type="date"
                                    defaultValue={currentPeriod?.endDate ? new Date(currentPeriod.endDate).toISOString().split('T')[0] : ""}
                                />
                            </div>
                        </div>

                        {/* Row 1: Cantidad y Unidad */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalQuantity">Cantidad de Alcance (TOTAL)</Label>
                                <Input
                                    id="totalQuantity"
                                    name="totalQuantity"
                                    type="number"
                                    step="0.01"
                                    defaultValue={currentPeriod?.totalQuantity || 0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scopeUnit">Unidad de la Cantidad de Alcance</Label>
                                <Select name="scopeUnit" defaultValue={currentPeriod?.scopeUnit || "HORAS"}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {scopeUnits.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Tarifa y Tipo Facturación */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rate">Tarifa</Label>
                                <Input
                                    id="rate"
                                    name="rate"
                                    type="number"
                                    step="0.01"
                                    defaultValue={currentPeriod?.rate || 0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billingType">Tipo de Facturación</Label>
                                <Select name="billingType" defaultValue={wp.billingType}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        {billingTypes.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 3: Tarifa Regularización y Tipo Regularización */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="regularizationRate">Tarifa de Regularización</Label>
                                <Input
                                    id="regularizationRate"
                                    name="regularizationRate"
                                    type="number"
                                    step="0.01"
                                    defaultValue={currentPeriod?.regularizationRate || ""}
                                    placeholder="Misma que tarifa normal"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="regularizationType">Tipo de Regularización</Label>
                                <Select name="regularizationType" defaultValue={currentPeriod?.regularizationType || "NONE"}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">No definido</SelectItem>
                                        {regularizationTypes.map(t => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 4: Premium y Tipo Renovación */}
                        <PremiumField
                            isPremium={currentPeriod?.isPremium || false}
                            premiumPrice={currentPeriod?.premiumPrice}
                            renewalTypes={renewalTypes}
                            defaultRenewalType={wp.renewalType}
                        />

                        <div className="flex justify-end pt-4">
                            <SubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
