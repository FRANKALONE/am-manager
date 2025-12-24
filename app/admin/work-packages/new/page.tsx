import { createWorkPackage, getWorkPackageById, updateWorkPackage } from "@/app/actions/work-packages";
import { getClients } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidityPeriodsManager } from "../components/validity-manager";
import { RegularizationManager } from "../components/regularization-manager";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Helper for select options
function SelectField({ label, name, options, defaultValue, required = false, children }: any) {
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
                <option value="">Selecciona...</option>
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
    const isEdit = !!params.id;
    let wp = null;

    if (isEdit && params.id) {
        wp = await getWorkPackageById(params.id);
    }

    // Fetch Data
    const clients = await getClients();
    const contractTypes = await getParametersByCategory("CONTRACT_TYPE");
    const billingTypes = await getParametersByCategory("BILLING_TYPE");
    const scopeUnits = await getParametersByCategory("SCOPE_UNIT");
    const renewalTypes = await getParametersByCategory("RENEWAL_TYPE");
    const regularizationTypes = await getParametersByCategory("REGULARIZATION_TYPE");
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
                <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Editar WP" : "Nuevo Work Package"}</h1>
                <p className="text-muted-foreground">Configuración del contrato v2.0</p>
            </div>

            <form action={action} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* General Info */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Identificación</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="clientId">Cliente</Label>
                                <select
                                    name="clientId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    defaultValue={wp?.clientId}
                                    required
                                    disabled={isEdit}
                                >
                                    <option value="">Selecciona Cliente...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id">ID WP (20 chars)</Label>
                                <Input name="id" maxLength={20} defaultValue={wp?.id} readOnly={isEdit} className={isEdit ? "bg-muted" : ""} required />
                                {isEdit && <input type="hidden" name="id" value={wp?.id} />}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre WP</Label>
                                <Input name="name" defaultValue={wp?.name} required />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 1: General Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos Generales</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre WP</Label>
                                <Input name="name" defaultValue={wp?.name} required />
                            </div>
                            <SelectField label="Tipo de Contrato" name="contractType" options={contractTypes} defaultValue={wp?.contractType} required />
                            <div className="space-y-2">
                                <Label htmlFor="jiraProjectKeys">Clave de Proyecto en JIRA</Label>
                                <Input name="jiraProjectKeys" defaultValue={wp?.jiraProjectKeys || ""} placeholder="Ej: PROJ1, PROJ2" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 2: Current Period Data (only in edit mode) */}
                    {isEdit && wp && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Datos del Periodo Vigente</CardTitle>
                                <CardDescription>Condiciones económicas y de gestión del periodo actual</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Economic Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cantidad de Alcance (TOTAL)</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.totalQuantity || 0}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unidad de la Cantidad de Alcance</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.scopeUnit || "HORAS"}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tarifa</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.rate || 0} €/h</div>
                                    </div>
                                    <SelectField label="Tipo de Facturación" name="billingType" options={billingTypes} defaultValue={wp?.billingType} required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Regularización</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.regularizationType || "No definido"}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tarifa de Regularización</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.rate || 0} €/h</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <SelectField label="Tipo de Renovación" name="renewalType" options={renewalTypes} defaultValue={wp?.renewalType} required />
                                    <div className="space-y-2">
                                        <Label>Premium</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.isPremium ? "Sí" : "No"}</div>
                                    </div>
                                </div>

                                {wp.validityPeriods?.[0]?.isPremium && (
                                    <div className="space-y-2">
                                        <Label>Tarifa de Premium</Label>
                                        <div className="text-lg font-semibold">{wp.validityPeriods?.[0]?.premiumPrice || 0} €</div>
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Para modificar estos valores, edita el periodo de validez correspondiente en la sección de "Periodos de Validez" más abajo.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* First Period Creation (only in create mode) */}
                    {!isEdit && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Primer Periodo de Validez y Condiciones Económicas</CardTitle>
                                <CardDescription>Define las fechas y condiciones económicas del primer periodo</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Dates */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="initialStartDate">Fecha Inicio</Label>
                                            <Input type="date" name="initialStartDate" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="initialEndDate">Fecha Fin</Label>
                                            <Input type="date" name="initialEndDate" required />
                                        </div>
                                    </div>

                                    {/* Economic Conditions */}
                                    <div className="border-t pt-4 space-y-4">
                                        <h4 className="font-semibold text-sm">Condiciones Económicas del Periodo</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="totalQuantity">Cantidad Total (Alcance)</Label>
                                                <Input type="number" step="0.01" name="totalQuantity" defaultValue="600" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="rate">Tarifa (€)</Label>
                                                <Input type="number" step="0.01" name="rate" defaultValue="50" required />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="premiumPrice">Precio Premium (€)</Label>
                                            <Input type="number" step="0.01" name="premiumPrice" placeholder="Opcional" />
                                        </div>
                                    </div>

                                    {/* Management Fields */}
                                    <div className="border-t pt-4 space-y-4">
                                        <h4 className="font-semibold text-sm">Gestión del Periodo</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField label="Unidad de Alcance" name="scopeUnit" options={scopeUnits} defaultValue="HORAS" required />
                                            <SelectField label="Tipo Regularización" name="regularizationType" options={regularizationTypes} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField label="Tipo de Facturación" name="billingType" options={billingTypes} required />
                                            <SelectField label="Tipo de Renovación" name="renewalType" options={renewalTypes} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="surplusStrategy">Mantenimiento Excedente</Label>
                                            <select name="surplusStrategy" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <option value="">--</option>
                                                <option value="3_MESES">3 Meses</option>
                                                <option value="6_MESES">6 Meses</option>
                                                <option value="9_MESES">9 Meses</option>
                                                <option value="12_MESES">12 Meses</option>
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
                                <CardTitle>Periodos de Validez</CardTitle>
                                <CardDescription>Gestión de periodos y sus condiciones económicas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ValidityPeriodsManager wpId={wp.id} periods={wp.validityPeriods || []} scopeUnits={scopeUnits} regularizationTypes={regularizationTypes} />
                            </CardContent>
                        </Card>
                    )}

                    {/* SECTION 3: Correction Factors */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Factores de Corrección</CardTitle>
                            <CardDescription>Gestión de modelos de corrección aplicables</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isEdit && wp ? (
                                <p className="text-sm text-muted-foreground">Los factores de corrección se gestionan desde el dashboard.</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Los factores de corrección se podrán configurar después de crear el WP.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Regularizations (Only Edit) */}
                    {isEdit && wp && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Regularizaciones Puntuales</CardTitle>
                                <CardDescription>Ajustes de excesos o devoluciones.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RegularizationManager wpId={wp.id} regularizations={wp.regularizations || []} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Custom Fields */}
                    {customFieldsDef.length > 0 && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Campos Adicionales</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                {customFieldsDef.map((field: any) => (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={`custom_${field.value}`}>{field.label}</Label>
                                        <Input
                                            id={`custom_${field.value}`}
                                            name={`custom_${field.value}`}
                                            placeholder={field.label}
                                            defaultValue={existingCustomAttrs[field.value] || ""}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="jiraProjectKeys">Claves de Proyecto JIRA (Separadas por comas)</Label>
                    <Input id="jiraProjectKeys" name="jiraProjectKeys" defaultValue={wp?.jiraProjectKeys || ""} placeholder="PROJ1, PROJ2" />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Link href="/admin/work-packages">
                        <Button variant="outline" type="button">Cancelar</Button>
                    </Link>
                    <Button type="submit">{isEdit ? "Guardar Cambios" : "Crear Work Package"}</Button>
                </div>
            </form>
        </div>
    );
}
