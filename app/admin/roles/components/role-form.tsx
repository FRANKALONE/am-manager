"use client";

import { useFormState } from "react-dom";
import { createRole, updateRole } from "@/app/actions/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useId } from "react";

const initialState = {
    error: "",
    message: ""
};

type Permission = {
    key: string;
    label: string;
    section: string;
};

const PERMISSIONS: Permission[] = [
    { key: "view_admin_dashboard", label: "Ver Dashboard de Administración", section: "Dashboards" },
    { key: "view_manager_dashboard", label: "Ver Dashboard de Gerente", section: "Dashboards" },
    { key: "view_client_dashboard", label: "Ver Dashboard de Consumos (Cliente)", section: "Dashboards" },
    { key: "view_evolutivos_admin", label: "Ver Gestión Evolutivos (Admin/Manager)", section: "Dashboards" },
    { key: "view_evolutivos_standard", label: "Ver Gestión Evolutivos (Estándar - Sin AMA)", section: "Dashboards" },
    { key: "view_evolutivos_client", label: "Ver Dashboard Evolutivos (Cliente)", section: "Dashboards" },
    { key: "view_service_intelligence", label: "Ver Service Intelligence (Premium)", section: "Dashboards" },
    { key: "view_optimization_hub", label: "Ver Optimization Hub & Consultoría (Gerentes)", section: "Dashboards" },

    { key: "view_cierres", label: "Ver Gestión de Cierres", section: "General" },
    { key: "manage_evolutivos", label: "Gestionar Evolutivos", section: "General" },
    { key: "request_review", label: "⭐ Solicitar Revisión de Imputaciones (Premium)", section: "General" },

    { key: "manage_users", label: "Gestionar Usuarios (App)", section: "Administración" },
    { key: "manage_client_users", label: "Gestionar Usuarios (Empresa)", section: "Administración" },
    { key: "manage_clients", label: "Gestionar Clientes", section: "Administración" },
    { key: "manage_wps", label: "Gestionar Work Packages", section: "Administración" },
    { key: "manage_roles", label: "Gestionar Roles", section: "Administración" },
    { key: "view_renewals", label: "Gestión de Renovaciones", section: "Administración" },
    { key: "manage_jira_requests", label: "Gestionar Solicitudes JIRA", section: "Administración" },
    { key: "manage_reviews", label: "Gestionar Reclamaciones (Admin)", section: "Administración" },
    { key: "view_reviews", label: "Ver Reclamaciones (Gerente)", section: "Administración" },
    { key: "manage_capacity", label: "Gestionar Capacidad de Equipo", section: "Administración" },
    { key: "manage_ama_evolutivos", label: "Control AMA Evolutivos", section: "Administración" },

    { key: "view_costs", label: "Ver Tarifas y Costes", section: "Finanzas" },
    { key: "edit_billing", label: "Editar Regularizaciones", section: "Finanzas" },

    { key: "manage_mass_emails", label: "Gestionar Emails Masivos", section: "Comunicación" },
    { key: "manage_landings", label: "Gestionar Landing Pages", section: "Comunicación" },

    { key: "view_all_clients", label: "Acceso Global: Ver Todos los Clientes", section: "Visibilidad" },
    { key: "view_all_wps", label: "Acceso Global: Ver Todos los WPs", section: "Visibilidad" },

    { key: "view_analytics_contracts", label: "Analytics: Validez de Contratos", section: "Analítica" },
    { key: "view_analytics_wp_consumption", label: "Analytics: Consumo Acumulado WP", section: "Analítica" },
    { key: "view_analytics_am_dashboard", label: "Analytics: Cuadro de Mando de AM", section: "Analítica" },
    { key: "view_analytics_ama_deviations", label: "Analytics: Desvío de Vencimiento", section: "Analítica" },
    { key: "view_analytics_annual_report", label: "Analytics: Informe Anual AM", section: "Analítica" },
];

type Props = {
    initialRole?: any; // If provided, we are in EDIT mode
};

export function RoleForm({ initialRole }: Props) {
    const isEdit = !!initialRole;

    // Parse permissions if they exist
    let currentPermissions: Record<string, boolean> = {};
    if (initialRole?.permissions) {
        try {
            currentPermissions = JSON.parse(initialRole.permissions);
        } catch (e) {
            console.error("Error parsing permissions", e);
        }
    }

    // Bind the updateRole action with the role ID if editing
    const updateWithId = isEdit ? updateRole.bind(null, initialRole.id) : createRole;
    const [state, formAction] = useFormState(updateWithId as any, initialState);
    const baseId = useId();

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-6">
                {isEdit ? "Editar Rol" : "Nuevo Rol"}
            </h1>

            <form action={formAction} className="space-y-6">
                <Card className="shadow-lg border-t-4 border-t-malachite">
                    <CardHeader>
                        <CardTitle>Datos del Rol</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm font-medium">
                                {state.error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre *</Label>
                                <Input id="name" name="name" defaultValue={initialRole?.name} required placeholder="Ej: CLIENTE" />
                            </div>
                            <div className="flex flex-col gap-3 pt-8">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`${baseId}-isActive`}
                                        name="isActive"
                                        title="Rol activo"
                                        aria-label="Rol activo"
                                        defaultChecked={initialRole ? initialRole.isActive : true}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor={`${baseId}-isActive`} className="font-normal cursor-pointer">
                                        Rol activo
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`${baseId}-isPremium`}
                                        name="isPremium"
                                        title="Rol Premium"
                                        aria-label="Rol Premium"
                                        defaultChecked={initialRole?.isPremium === 1}
                                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <Label htmlFor={`${baseId}-isPremium`} className="font-normal cursor-pointer">
                                        ⭐ Rol Premium
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <textarea
                                id="description"
                                name="description"
                                defaultValue={initialRole?.description}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Descripción del rol..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ACCESOS POR SECCIÓN */}
                    <Card className="shadow-lg border-t-4 border-t-blue-500">
                        <CardHeader>
                            <CardTitle>Permisos de Funciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {["Dashboards", "Analítica", "General", "Administración", "Finanzas", "Comunicación"].map(section => (
                                <div key={section} className="space-y-3">
                                    <h3 className="font-bold text-dark-green border-b pb-1 mb-4">{section}</h3>
                                    <div className="space-y-3">
                                        {PERMISSIONS.filter(p => p.section === section).map(p => (
                                            <div key={p.key} className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    id={`${baseId}-perm-${p.key}`}
                                                    name={`perm_${p.key}`}
                                                    title={p.label}
                                                    aria-label={p.label}
                                                    defaultChecked={currentPermissions[p.key]}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <Label htmlFor={`${baseId}-perm-${p.key}`} className="font-medium cursor-pointer">
                                                    {p.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* ALCANCE DE VISIBILIDAD */}
                    <Card className="shadow-lg border-t-4 border-t-amber-500">
                        <CardHeader>
                            <CardTitle>Alcance de Visibilidad</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800 mb-4">
                                <strong>Nota:</strong> Si no se activa el acceso global, el usuario solo verá los clientes y WPs que tenga asignados explícitamente.
                            </div>

                            <div className="space-y-4">
                                {PERMISSIONS.filter(p => p.section === "Visibilidad").map(p => (
                                    <div key={p.key} className="flex items-center space-x-3 p-3 bg-white border rounded shadow-sm">
                                        <input
                                            type="checkbox"
                                            id={`${baseId}-vis-${p.key}`}
                                            name={`perm_${p.key}`}
                                            title={p.label}
                                            aria-label={p.label}
                                            defaultChecked={currentPermissions[p.key]}
                                            className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="flex flex-col">
                                            <Label htmlFor={`${baseId}-vis-${p.key}`} className="font-bold cursor-pointer">
                                                {p.label}
                                            </Label>
                                            <span className="text-xs text-muted-foreground">Omitir restricciones por asignación</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Link href="/admin/roles">
                        <Button variant="outline" type="button">Cancelar</Button>
                    </Link>
                    <Button type="submit" className="bg-malachite hover:bg-jade transition-colors">
                        {isEdit ? "Actualizar Rol" : "Guardar Rol"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
