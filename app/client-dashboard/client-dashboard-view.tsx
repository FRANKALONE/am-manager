"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/app/dashboard/components/dashboard-view";
import { BookOpen, BarChart3, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";

type Props = {
    user: any;
    workPackages: any[];
    clients: any[];
    permissions: Record<string, boolean>;
};

export function ClientDashboard({ user, workPackages, clients, permissions }: Props) {
    const [selectedWpId, setSelectedWpId] = useState<string>("");
    const [showDashboard, setShowDashboard] = useState(false);

    // Filter WPs based on user's client and assigned WPs
    const availableWPs = workPackages.filter(wp => {
        // Must belong to user's client
        if (wp.clientId !== user.clientId) return false;

        // If user has specific WPs assigned, only show those
        if (user.workPackageIds) {
            try {
                const assignedWPs = typeof user.workPackageIds === 'string'
                    ? JSON.parse(user.workPackageIds)
                    : user.workPackageIds;

                if (Array.isArray(assignedWPs) && assignedWPs.length > 0) {
                    return assignedWPs.includes(wp.id);
                }
            } catch {
                // If parse fails or not an array, show all client WPs
            }
        }

        return true; // No specific WPs assigned, show all client WPs
    });

    const selectedWP = workPackages.find(wp => wp.id === selectedWpId);

    const handleViewDashboard = () => {
        if (selectedWpId) {
            setShowDashboard(true);
        }
    };

    if (showDashboard && selectedWP) {
        return (
            <div className="p-8">
                <div className="mb-6 flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={() => setShowDashboard(false)}
                    >
                        ← Volver a Selección de WP
                    </Button>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                        <span className="text-sm font-semibold text-blue-900">
                            Analizando: {selectedWP.name} ({selectedWP.id})
                        </span>
                    </div>
                </div>

                <DashboardView
                    clients={clients}
                    permissions={permissions}
                    userId={user.id}
                    initialClientId={user.clientId}
                    initialWpId={selectedWP.id}
                    readOnly={true}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Dashboard AM Clientes
                    </h1>
                    <p className="text-gray-600">
                        Bienvenido, {user.name} {user.surname}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="shadow-xl md:col-span-2">
                        <CardHeader className="bg-white border-b">
                            <CardTitle className="text-dark-green">Reporte de Consumos</CardTitle>
                            <CardDescription>
                                Selecciona un Work Package para ver su dashboard de consumos en tiempo real
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {availableWPs.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                                    <p className="text-gray-500 mb-2 font-medium">No tienes Work Packages asignados actualmente.</p>
                                    <p className="text-sm text-gray-400">Contacta con tu gestor AM para solicitar acceso.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <Label htmlFor="wpSelect" className="text-base">Work Package de tu Cliente</Label>
                                        <select
                                            id="wpSelect"
                                            value={selectedWpId}
                                            onChange={(e) => setSelectedWpId(e.target.value)}
                                            className="flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow cursor-pointer"
                                        >
                                            <option value="">-- Seleccionar Work Package (Contrato) --</option>
                                            {availableWPs.map(wp => (
                                                <option key={wp.id} value={wp.id}>
                                                    {wp.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedWpId && selectedWP && (() => {
                                        // Get current validity period
                                        const now = new Date();
                                        const currentPeriod = (selectedWP as any).validityPeriods?.find((vp: any) =>
                                            new Date(vp.startDate) <= now && new Date(vp.endDate) >= now
                                        );

                                        return (
                                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                                <h3 className="font-bold text-blue-900 mb-3 border-b border-blue-200 pb-2">Información del WP:</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-blue-600 uppercase font-bold">Nombre</p>
                                                        <p className="text-sm text-gray-800 font-medium">{selectedWP.name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-blue-600 uppercase font-bold">WP ID</p>
                                                        <p className="text-sm text-gray-800 font-medium">{selectedWP.id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-blue-600 uppercase font-bold">Modalidad</p>
                                                        <p className="text-sm text-gray-800 font-medium">{selectedWP.contractType}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-blue-600 uppercase font-bold">Facturación</p>
                                                        <p className="text-sm text-gray-800 font-medium">{selectedWP.billingType}</p>
                                                    </div>
                                                    {currentPeriod?.regularizationType && (
                                                        <div>
                                                            <p className="text-xs text-blue-600 uppercase font-bold">Tipo de Regularización</p>
                                                            <p className="text-sm text-gray-800 font-medium">{currentPeriod.regularizationType}</p>
                                                        </div>
                                                    )}
                                                    {currentPeriod?.isPremium && (
                                                        <div>
                                                            <p className="text-xs text-blue-600 uppercase font-bold">Premium</p>
                                                            <p className="text-sm text-gray-800 font-medium">Sí</p>
                                                        </div>
                                                    )}
                                                    {currentPeriod && (
                                                        <div className="col-span-2">
                                                            <p className="text-xs text-blue-600 uppercase font-bold">Vigencia del Contrato Actual</p>
                                                            <p className="text-sm text-gray-800 font-medium">
                                                                {formatDate(currentPeriod.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })} - {formatDate(currentPeriod.endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex justify-end pt-4 border-t">
                                        <Button
                                            onClick={handleViewDashboard}
                                            disabled={!selectedWpId}
                                            className="bg-malachite hover:bg-jade px-8 h-11 text-base font-bold shadow-lg transition-all active:scale-95"
                                        >
                                            Acceder al Reporte de consumos de {selectedWP?.name || "WP"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl bg-gradient-to-br from-orange-50 to-amber-50 md:col-span-1 border-orange-200">
                        <CardHeader className="bg-white/50 border-b border-orange-100">
                            <CardTitle className="text-orange-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-orange-600" />
                                Gestión de Evolutivos
                            </CardTitle>
                            <CardDescription className="text-orange-700/70">
                                Planificación, hitos y responsables de tus proyectos evolutivos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Link href="/dashboard/evolutivos">
                                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 group shadow-md shadow-orange-200">
                                    Ir al Centro de Trabajo
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
