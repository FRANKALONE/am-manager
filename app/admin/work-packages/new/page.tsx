import { createWorkPackage, getWorkPackageById, updateWorkPackage } from "@/app/actions/work-packages";
import { getClients } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidityPeriodsManager } from "../components/validity-manager";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "@/lib/get-translations";

// Helper for select options
function SelectField({ label, name, options, defaultValue, required = false, children, t }: any) {
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <select
                id={name}
                name={name}
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

// Reuse this page for New and Edit
export default async function WorkPackageFormPage({ params }: { params: { id?: string } }) {
    const { t } = await getTranslations();
    const isEdit = !!params.id;
    let wp: any = null;

    if (isEdit && params.id) {
        wp = await getWorkPackageById(params.id);
    }

    // Fetch Data
    const clients = await getClients();
    const contractTypes = (await getParametersByCategory("CONTRACT_TYPE")).map(p => ({
        ...p,
        label: t(`parameters.CONTRACT_TYPE.${p.value}`, { defaultValue: p.label })
    }));
    const billingTypes = (await getParametersByCategory("BILLING_TYPE")).map(p => ({
        ...p,
        label: t(`parameters.BILLING_TYPE.${p.value}`, { defaultValue: p.label })
    }));
    const scopeUnits = (await getParametersByCategory("SCOPE_UNIT")).map(p => ({
        ...p,
        label: t(`parameters.SCOPE_UNIT.${p.value}`, { defaultValue: p.label })
    }));
    const renewalTypes = (await getParametersByCategory("RENEWAL_TYPE")).map(p => ({
        ...p,
        label: t(`parameters.RENEWAL_TYPE.${p.value}`, { defaultValue: p.label })
    }));
    const regularizationTypes = (await getParametersByCategory("REGULARIZATION_TYPE")).map(p => ({
        ...p,
        label: t(`parameters.REGULARIZATION_TYPE.${p.value}`, { defaultValue: p.label })
    }));
    const customFieldsDef = await getParametersByCategory("CUSTOM_FIELD_WP");

    async function action(formData: FormData) {
        "use server";
        if (isEdit) {
            const id = formData.get("id") as string;
            if (!id) throw new Error("ID not found");
            await updateWorkPackage(id, {}, formData);
        } else {
            await createWorkPackage({}, formData);
        }
    }

    let existingCustomAttrs: Record<string, string> = {};
    if (wp && wp.customAttributes) {
        try {
            existingCustomAttrs = JSON.parse(wp.customAttributes);
        } catch (e) { }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isEdit ? t('workPackages.form.editTitle') : t('workPackages.form.title')}
                </h1>
                <p className="text-muted-foreground">{t('workPackages.form.subtitle')}</p>
            </div>

            <form action={action} className="space-y-6">
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    defaultValue={wp?.clientId}
                                    required
                                    disabled={isEdit}
                                >
                                    <option value="">{t('workPackages.form.labels.selectClient')}</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id">{t('workPackages.form.labels.id')}</Label>
                                <Input name="id" maxLength={20} defaultValue={wp?.id} readOnly={isEdit} className={isEdit ? "bg-muted" : ""} required />
                                {isEdit && <input type="hidden" name="id" value={wp?.id} />}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('workPackages.form.labels.name')}</Label>
                                <Input name="name" defaultValue={wp?.name} required />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 1: General Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('workPackages.form.cardGeneralData')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('workPackages.form.labels.name')}</Label>
                                <Input name="name" defaultValue={wp?.name} required />
                            </div>
                            <SelectField
                                label={t('workPackages.form.labels.contractType')}
                                name="contractType"
                                options={contractTypes}
                                defaultValue={wp?.contractType}
                                required
                                t={t}
                            />
                            <div className="space-y-2">
                                <Label htmlFor="jiraProjectKeys">{t('workPackages.form.labels.jiraKeys')}</Label>
                                <Input name="jiraProjectKeys" defaultValue={wp?.jiraProjectKeys || ""} placeholder={t('workPackages.form.labels.jiraKeysPlaceholder')} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 2: Current Period Data (only in edit mode) */}
                    {isEdit && wp && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>{t('workPackages.form.cardCurrentPeriod')}</CardTitle>
                                <CardDescription>{t('workPackages.form.cardCurrentPeriodDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Economic Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.scopeQuantity')}</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.totalQuantity || 0}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.scopeUnit')}</Label>
                                        <div className="text-lg font-semibold">
                                            {wp.validityPeriods?.[0]?.scopeUnit ? t(`parameters.SCOPE_UNIT.${wp.validityPeriods[0].scopeUnit}`, { defaultValue: wp.validityPeriods[0].scopeUnit }) : t('workPackages.form.labels.none')}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.rate')}</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.rate || 0} €/h</div>
                                    </div>
                                    <SelectField
                                        label={t('workPackages.form.labels.billingType')}
                                        name="billingType"
                                        options={billingTypes}
                                        defaultValue={wp?.billingType}
                                        required
                                        t={t}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.regType')}</Label>
                                        <div className="text-lg font-semibold">
                                            {wp.validityPeriods?.[0]?.regularizationType ? t(`parameters.REGULARIZATION_TYPE.${wp.validityPeriods[0].regularizationType}`, { defaultValue: wp.validityPeriods[0].regularizationType }) : t('workPackages.form.labels.none')}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.regRate')}</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.rate || 0} €/h</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField
                                        label={t('workPackages.form.labels.renewalType')}
                                        name="renewalType"
                                        options={renewalTypes}
                                        defaultValue={wp?.renewalType}
                                        required
                                        t={t}
                                    />
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.premium')}</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.isPremium ? t('common.yes') : t('common.no')}</div>
                                    </div>
                                </div>

                                {wp.validityPeriods?.[0]?.isPremium && (
                                    <div className="space-y-2">
                                        <Label>{t('workPackages.form.labels.premiumPrice')}</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.premiumPrice || 0} €</div>
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        {t('workPackages.form.labels.editPeriodInfo')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* First Period Creation (only in create mode) */}
                    {!isEdit && (
                        <Card className="md:col-span-2">
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
                                                <Input type="number" step="0.01" name="totalQuantity" defaultValue="600" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="rate">{t('workPackages.form.labels.rate')} (€)</Label>
                                                <Input type="number" step="0.01" name="rate" defaultValue="50" required />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="premiumPrice">{t('workPackages.form.labels.premiumPrice')} (€)</Label>
                                            <Input type="number" step="0.01" name="premiumPrice" placeholder={t('workPackages.form.labels.none')} />
                                        </div>
                                    </div>

                                    {/* Management Fields */}
                                    <div className="border-t pt-4 space-y-4">
                                        <h4 className="font-semibold text-sm">{t('workPackages.form.labels.initialPeriodMgmt')}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField label={t('workPackages.form.labels.scopeUnit')} name="scopeUnit" options={scopeUnits} defaultValue="HORAS" required t={t} />
                                            <SelectField label={t('workPackages.form.labels.regType')} name="regularizationType" options={regularizationTypes} t={t} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField label={t('workPackages.form.labels.billingType')} name="billingType" options={billingTypes} required t={t} />
                                            <SelectField label={t('workPackages.form.labels.renewalType')} name="renewalType" options={renewalTypes} required t={t} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="surplusStrategy">{t('workPackages.form.labels.surplusStrategy')}</Label>
                                            <select name="surplusStrategy" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <option value="">{t('workPackages.form.labels.none')}</option>
                                                <option value="3_MESES">3 {t('common.months')}</option>
                                                <option value="6_MESES">6 {t('common.months')}</option>
                                                <option value="9_MESES">9 {t('common.months')}</option>
                                                <option value="12_MESES">12 {t('common.months')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Validity Periods Management (Only Edit) */}
                    {isEdit && wp && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>{t('workPackages.form.cardValidityPeriods')}</CardTitle>
                                <CardDescription>{t('workPackages.form.cardValidityPeriodsDesc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ValidityPeriodsManager
                                    wpId={wp.id}
                                    periods={wp.validityPeriods || []}
                                    scopeUnits={scopeUnits}
                                    regularizationTypes={regularizationTypes}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* SECTION 3: Correction Factors */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>{t('workPackages.form.cardCorrectionFactors')}</CardTitle>
                            <CardDescription>{t('workPackages.form.cardCorrectionFactorsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isEdit && wp ? (
                                <p className="text-sm text-muted-foreground">{t('workPackages.form.labels.correctionDashInfo')}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('workPackages.form.labels.correctionAfterInfo')}</p>
                            )}
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
                                                defaultValue={existingCustomAttrs[field.value] || ""}
                                            />
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="jiraProjectKeys">{t('workPackages.form.labels.jiraKeysHelp')}</Label>
                    <Input id="jiraProjectKeys" name="jiraProjectKeys" defaultValue={wp?.jiraProjectKeys || ""} placeholder={t('workPackages.form.labels.jiraKeysPlaceholder')} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Link href="/admin/work-packages">
                        <Button variant="outline" type="button">{t('workPackages.form.buttons.cancel')}</Button>
                    </Link>
                    <Button type="submit">{isEdit ? t('workPackages.form.buttons.update') : t('workPackages.form.buttons.save')}</Button>
                </div>
            </form>
        </div>
    );
}
