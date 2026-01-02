"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

            <div className="space-y-2">
                <Label htmlFor="reportEmails">Emails para Reportes Mensuales</Label>
                <Input
                    id="reportEmails"
                    name="reportEmails"
                    placeholder="email1@cliente.com, email2@cliente.com"
                    defaultValue={client?.reportEmails || ""}
                />
                <p className="text-xs text-muted-foreground">Emails de contactos del cliente para enviar reportes mensuales (separados por coma).</p>
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
