"use client";

import { useFormState } from "react-dom";
import { createWorkPackage } from "@/app/actions/work-packages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

// Helper for select options
function SelectField({ label, name, options, defaultValue, required = false, children, t }: any) {
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <select
                id={name}
                name={name}
                title={label}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={defaultValue || ""}
                required={required}
            >
                <option value="">{t('workPackages.form.labels.select')}</option>
                {options && options.map((opt: any) => (
                    <option key={opt.id || opt.value} value={opt.value}>
                        {opt.label || opt.name}
                    </option>
                ))}
                {children}
            </select>
        </div>
    );
}

export function WorkPackageNewForm({
    clients,
    contractTypes,
    billingTypes,
    scopeUnits,
    renewalTypes,
    regularizationTypes,
    customFieldsDef,
    specialRegularizations = []
}: any) {
    const { t } = useTranslations();
    const [state, formAction] = useFormState(createWorkPackage, { error: "" });

    return (
        <form action={formAction} className="space-y-6">
            {state?.error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm font-medium">
                    {state.error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* General Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t('workPackages.form.cardIdentification')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="clientId">{t('workPackages.form.labels.client')}</Label>
                            <select
                                name="clientId"
                                title={t('workPackages.form.labels.client')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">{t('workPackages.form.labels.selectClient')}</option>
                                {clients.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id">{t('workPackages.form.labels.id')}</Label>
                            <Input name="id" maxLength={20} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('workPackages.form.labels.name')}</Label>
                            <Input name="name" required />
                        </div>
                    </CardContent>
                </Card>

                {/* SECTION 1: General Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('workPackages.form.cardGeneralData')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <SelectField
                            label={t('workPackages.form.labels.contractType')}
                            name="contractType"
                            options={contractTypes}
                            required
                            t={t}
                        />
                        <div className="space-y-2">
                            <Label htmlFor="jiraProjectKeys">{t('workPackages.form.labels.jiraKeys')}</Label>
                            <Input name="jiraProjectKeys" placeholder={t('workPackages.form.labels.jiraKeysPlaceholder')} />
                        </div>

                        {/* Consumo configuration */}
                        <div className="space-y-4 pt-4 border-t mt-4">
                            <h3 className="text-sm font-medium">Configuración de Consumo</h3>

                            <div className="space-y-2">
                                <Label htmlFor="includedTicketTypes">Tipos de Ticket Consumibles</Label>
                                <Input
                                    id="includedTicketTypes"
                                    name="includedTicketTypes"
                                    title="Tipos de Ticket Consumibles"
                                    placeholder="Ej: Incidencia, Consulta, Soporte AM"
                                />
                                <p className="text-[10px] text-muted-foreground">Separar por comas. Vacío = global.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="hasIaasService"
                                        name="hasIaasService"
                                        title="Incluir IAAS"
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
                                        defaultChecked={true}
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
                                        defaultChecked={true}
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
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="isMainWP" className="font-bold cursor-pointer text-xs text-green-600 uppercase">
                                        WP PRINCIPAL
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* First Period Creation */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>{t('workPackages.form.cardInitialPeriod')}</CardTitle>
                        <CardDescription>{t('workPackages.form.cardInitialPeriodDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Dates */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="initialStartDate">{t('workPackages.form.labels.startDate')}</Label>
                                    <Input type="date" name="initialStartDate" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="initialEndDate">{t('workPackages.form.labels.endDate')}</Label>
                                    <Input type="date" name="initialEndDate" required />
                                </div>
                            </div>

                            {/* Economic Conditions */}
                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-semibold text-sm">{t('workPackages.form.labels.initialPeriodEcon')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="totalQuantity">{t('workPackages.form.labels.scopeQuantity')}</Label>
                                        <Input type="number" step="0.01" name="totalQuantity" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="rate">{t('workPackages.form.labels.rate')} (€)</Label>
                                        <Input type="number" step="0.01" name="rate" defaultValue="50" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="rateEvolutivo">{t('workPackages.form.labels.rateEvolutivo')} (€)</Label>
                                        <Input type="number" step="0.01" name="rateEvolutivo" placeholder="Opcional" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="premiumPrice">{t('workPackages.form.labels.premiumPrice')} (€)</Label>
                                        <Input type="number" step="0.01" name="premiumPrice" placeholder={t('workPackages.form.labels.none')} />
                                    </div>
                                </div>
                            </div>

                            {/* Management Fields */}
                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-semibold text-sm">{t('workPackages.form.labels.initialPeriodMgmt')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label={t('workPackages.form.labels.scopeUnit')} name="scopeUnit" options={scopeUnits} defaultValue="HORAS" required t={t} />
                                    <div className="space-y-2">
                                        <Label htmlFor="regularizationRate">{t('workPackages.form.labels.regRate')} (€)</Label>
                                        <Input type="number" step="0.01" name="regularizationRate" placeholder="Misma que tarifa" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label={t('workPackages.form.labels.billingType')} name="billingType" options={billingTypes} required t={t} />
                                    <SelectField label={t('workPackages.form.labels.regularizationType')} name="regularizationType" options={regularizationTypes} defaultValue="NONE" t={t} />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <SelectField
                                        label="Regularización Especial (Configurada)"
                                        name="specialRegularizationId"
                                        options={specialRegularizations}
                                        t={t}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic -mt-2">
                                        Si se selecciona, prevalecerá sobre la tarifa de regularización estándar.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label={t('workPackages.form.labels.renewalType')} name="renewalType" options={renewalTypes} required t={t} />
                                    <div className="space-y-2">
                                        <Label htmlFor="isPremium">Premium</Label>
                                        <select
                                            name="isPremium"
                                            title="Premium"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="false">No</option>
                                            <option value="true">Sí</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Custom Fields */}
                {customFieldsDef.length > 0 && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>{t('workPackages.form.cardCustomFields')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {customFieldsDef.map((field: any) => {
                                const translatedLabel = t(`parameters.CUSTOM_FIELD_WP.${field.value}`, { defaultValue: field.label });
                                return (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={`custom_${field.value}`}>{translatedLabel}</Label>
                                        <Input
                                            id={`custom_${field.value}`}
                                            name={`custom_${field.value}`}
                                            placeholder={translatedLabel}
                                        />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Link href="/admin/work-packages">
                    <Button variant="outline" type="button">{t('workPackages.form.buttons.cancel')}</Button>
                </Link>
                <Button type="submit">{t('workPackages.form.buttons.save')}</Button>
            </div>
        </form>
    );
}
