"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { LogoUpload } from "./logo-upload";

interface ClientFormFieldsProps {
    client: any;
    managers: any[];
    customFieldsDef: any[];
    existingCustomAttrs: Record<string, string>;
    isEdit: boolean;
    action: (formData: FormData) => void | Promise<void>;
}

export function ClientFormFields({
    client,
    managers,
    customFieldsDef,
    existingCustomAttrs,
    isEdit,
    action
}: ClientFormFieldsProps) {
    const [logoUrl, setLogoUrl] = useState(client?.clientLogo || "");

    return (
        <form action={action} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="id">ID Cliente (Máx 10)</Label>
                <Input
                    id="id"
                    name="id"
                    maxLength={10}
                    placeholder="C-001"
                    defaultValue={client?.id}
                    readOnly={isEdit}
                    className={isEdit ? "bg-muted" : ""}
                />
                {isEdit && <input type="hidden" name="id" value={client?.id} />}
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Nombre Cliente</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Empresa S.L."
                    defaultValue={client?.name}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="manager">Gerente Responsable</Label>
                <select
                    id="manager"
                    name="manager"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    defaultValue={client?.manager || ""}
                >
                    <option value="">Selecciona un gerente...</option>
                    {managers.map((m: any) => (
                        <option key={m.id} value={m.value}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="clientPortalUrl">URL del Portal de Cliente</Label>
                <Input
                    id="clientPortalUrl"
                    name="clientPortalUrl"
                    type="url"
                    placeholder="https://portal.cliente.com"
                    defaultValue={client?.clientPortalUrl || ""}
                />
                <p className="text-xs text-muted-foreground">URL del portal web del cliente (opcional)</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-bold">Emails para Reportes Mensuales</Label>

                {isEdit && client?.users && client.users.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {client.users.map((user: any) => {
                            const isChecked = client.reportEmails?.includes(user.email);
                            return (
                                <div key={user.id} className="flex items-center space-x-3 p-2 bg-white rounded border border-slate-200">
                                    <Checkbox
                                        id={`user_${user.id}`}
                                        name="selectedReportEmails"
                                        value={user.email}
                                        defaultChecked={isChecked}
                                    />
                                    <Label htmlFor={`user_${user.id}`} className="flex flex-col gap-0.5 cursor-pointer">
                                        <span className="font-bold text-sm">{user.name} {user.surname || ""}</span>
                                        <span className="text-[10px] text-muted-foreground">{user.email}</span>
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-dashed text-center">
                        {isEdit
                            ? "No hay usuarios registrados asociados a este cliente para seleccionar."
                            : "Guarda el cliente primero para poder asociar usuarios y seleccionarlos para los reportes."
                        }
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="reportEmails" className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Emails Adicionales / Otros</Label>
                    <Input
                        id="reportEmails"
                        name="reportEmails"
                        placeholder="email-externo@cliente.com, otro-email@test.com"
                        defaultValue={client?.reportEmails && isEdit ? client.reportEmails.split(',').filter((e: string) => !client.users?.some((u: any) => u.email === e.trim())).join(', ') : (client?.reportEmails || "")}
                    />
                    <p className="text-[10px] text-muted-foreground">Emails adicionales separados por coma. Los usuarios seleccionados arriba se añadirán automáticamente.</p>
                </div>
            </div>

            <LogoUpload
                currentLogoUrl={client?.clientLogo}
                onLogoChange={setLogoUrl}
            />

            {/* Dynamic Custom Fields */}
            {customFieldsDef.length > 0 && (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Campos Adicionales</h3>
                    {customFieldsDef.map((field) => (
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
                </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
                <Link href="/admin/clients">
                    <Button variant="outline" type="button">Cancelar</Button>
                </Link>
                <Button type="submit">{isEdit ? "Guardar Cambios" : "Crear Cliente"}</Button>
            </div>
        </form>
    );
}
