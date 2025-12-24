"use client";

import { useFormState } from "react-dom";
import { createUser, updateUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";

const initialState = {
    error: "",
    message: ""
};

type Props = {
    clients: any[];
    roles: any[];
    workPackages: any[];
    initialUser?: any; // If provided, we are in EDIT mode
};

export function UserForm({ clients, roles, workPackages, initialUser }: Props) {
    const isEdit = !!initialUser;

    // Bind the updateUser action with the user ID if editing
    const updateWithId = isEdit ? updateUser.bind(null, initialUser.id) : createUser;
    const [state, formAction] = useFormState(updateWithId as any, initialState);

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">
                {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
            </h1>

            <Card className="shadow-lg border-t-4 border-t-malachite">
                <CardHeader>
                    <CardTitle>Datos del Usuario</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm font-medium">
                                {state.error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre *</Label>
                                <Input id="name" name="name" defaultValue={initialUser?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="surname">Apellidos</Label>
                                <Input id="surname" name="surname" defaultValue={initialUser?.surname} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" name="email" type="email" defaultValue={initialUser?.email} required />
                        </div>

                        {!isEdit && (
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña *</Label>
                                <Input id="password" name="password" type="text" required placeholder="Contraseña inicial" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol *</Label>
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    defaultValue={initialUser?.role}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientId">Cliente</Label>
                                <select
                                    id="clientId"
                                    name="clientId"
                                    defaultValue={initialUser?.clientId || ""}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">-- Ninguno --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workPackageIds">Work Packages (opcional)</Label>
                            <p className="text-sm text-muted-foreground mb-2">
                                Si no seleccionas ninguno, tendrá acceso a todos los WPs del cliente.
                            </p>
                            <textarea
                                id="workPackageIds"
                                name="workPackageIds"
                                defaultValue={initialUser?.workPackageIds}
                                placeholder='Ejemplo: ["WP001", "WP002"]'
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <p className="text-sm text-muted-foreground">
                                Formato JSON array de IDs de WP. Ejemplo: ["AMA00253MANT0001.1.1"]
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link href="/admin/users">
                                <Button variant="outline" type="button">Cancelar</Button>
                            </Link>
                            <Button type="submit" className="bg-malachite hover:bg-jade transition-colors">
                                {isEdit ? "Actualizar Usuario" : "Guardar Usuario"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
