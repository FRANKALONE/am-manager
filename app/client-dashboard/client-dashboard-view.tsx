"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/app/dashboard/components/dashboard-view";
import { BookOpen, BarChart3, Calendar, ArrowRight, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { notifyProposalRequestAction } from "@/app/actions/proposals";
import { toast } from "sonner";

type Props = {
    user: any;
    workPackages: any[];
    clients: any[];
    permissions: Record<string, boolean>;
};

export function ClientDashboard({ user, workPackages, clients, permissions }: Props) {
    const [selectedWpId, setSelectedWpId] = useState<string>("");
    const [showDashboard, setShowDashboard] = useState(false);
    const [requesting, setRequesting] = useState(false);

    const handleRequestProposal = async () => {
        if (requesting) return;
        setRequesting(true);
        toast.info("Enviando solicitud al gestor...");

        try {
            const result = await notifyProposalRequestAction(user.clientId, "Optimización General", {
                justification: "El cliente ha solicitado una propuesta de optimización directamente desde su dashboard principal."
            });

            if (result.success) {
                toast.success("Solicitud enviada. Tu gestor AM se pondrá en contacto contigo pronto.");
            } else {
                toast.error("Error al enviar solicitud: " + (result.error || "Desconocido"));
            }
        } catch (error) {
            toast.error("Error inesperado al solicitar propuesta");
        } finally {
            setRequesting(false);
        }
    };

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
        <div className="bg-gradient-to-br from-slate-50 to-blue-100 min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">
                            Dashboard AM Clientes
                        </h1>
                        <p className="text-slate-600">
                            Bienvenido, {user.name} {user.surname}
                        </p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Portal Cliente</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="shadow-2xl md:col-span-2 border-none overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="bg-gradient-to-r from-dark-green to-jade text-white p-6">
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-6 h-6" />
                                <div>
                                    <CardTitle className="text-xl">Reporte de Consumos</CardTitle>
                                    <CardDescription className="text-white/80">
                                        Visualiza los consumos de tus Work Packages en tiempo real
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-8 p-6">
                            {availableWPs.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-slate-500 mb-2 font-medium">No tienes Work Packages asignados actualmente.</p>
                                    <p className="text-sm text-slate-400">Contacta con tu gestor AM para solicitar acceso.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <Label htmlFor="wpSelect" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-malachite" />
                                            1. Selecciona Work Package (Contrato)
                                        </Label>
                                        <select
                                            id="wpSelect"
                                            value={selectedWpId}
                                            onChange={(e) => setSelectedWpId(e.target.value)}
                                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite transition-all cursor-pointer hover:border-malachite/50"
                                        >
                                            <option value="">-- Seleccionar Work Package --</option>
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
                                            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <span className="w-1.5 h-4 bg-malachite rounded-full" />
                                                    Información del Contrato
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Modalidad</p>
                                                        <p className="text-sm text-slate-700 font-semibold">{selectedWP.contractType}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Facturación</p>
                                                        <p className="text-sm text-slate-700 font-semibold">{selectedWP.billingType}</p>
                                                    </div>
                                                    {currentPeriod?.regularizationType && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Regularización</p>
                                                            <p className="text-sm text-slate-700 font-semibold">{currentPeriod.regularizationType}</p>
                                                        </div>
                                                    )}
                                                    {currentPeriod && (
                                                        <div className="col-span-full pt-4 border-t border-slate-200/50">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Periodo de Vigencia Actual</p>
                                                            <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 text-sm font-medium text-slate-600">
                                                                {formatDate(currentPeriod.startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                                                {formatDate(currentPeriod.endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex justify-end pt-6 border-t border-slate-100">
                                        <Button
                                            onClick={handleViewDashboard}
                                            disabled={!selectedWpId}
                                            className="bg-malachite hover:bg-jade px-10 h-12 text-base font-bold shadow-xl shadow-malachite/20 transition-all active:scale-95 disabled:grayscale"
                                        >
                                            Abrir Reporte de {selectedWP?.name || "Consumos"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-8 flex flex-col">
                        {(permissions.view_evolutivos_admin || permissions.view_evolutivos_client) && (
                            <Card className="shadow-2xl bg-gradient-to-br from-amber-500 to-orange-600 border-none text-white overflow-hidden relative group flex-1">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Calendar className="w-24 h-24" />
                                </div>
                                <CardHeader className="relative p-6">
                                    <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                                        <Calendar className="w-6 h-6" />
                                        Evolutivos
                                    </CardTitle>
                                    <CardDescription className="text-orange-100 text-sm leading-relaxed">
                                        Seguimiento de hitos y planificación de tus proyectos evolutivos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="relative pt-2 p-6">
                                    <Link href={permissions.view_evolutivos_admin ? "/evolutivos" : "/dashboard/evolutivos"}>
                                        <Button className="w-full bg-white text-orange-600 hover:bg-orange-50 h-14 text-lg font-bold flex items-center gap-2 group transition-all shadow-lg shadow-orange-900/20">
                                            Ir al Centro
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-none text-white overflow-hidden relative group flex-1">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <Users className="w-24 h-24" />
                            </div>
                            <CardHeader className="relative p-6">
                                <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                                    <Users className="w-6 h-6" />
                                    Usuarios
                                </CardTitle>
                                <CardDescription className="text-blue-100 text-sm leading-relaxed">
                                    Gestión de usuarios de tu organización y vinculación con JIRA.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="relative pt-2 p-6">
                                <Link href="/dashboard/users">
                                    <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 h-14 text-lg font-bold flex items-center gap-2 group transition-all shadow-lg shadow-blue-900/20">
                                        Configurar
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Optimization Card for Client - Only show if user has permission */}
                        {permissions.view_optimization_hub && (
                            <Card className="shadow-2xl bg-gradient-to-br from-indigo-700 to-purple-800 border-none text-white overflow-hidden relative group flex-1">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Sparkles className="w-24 h-24" />
                                </div>
                                <CardHeader className="relative p-6">
                                    <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                                        <Sparkles className="w-6 h-6" />
                                        Optimization Hub
                                    </CardTitle>
                                    <CardDescription className="text-indigo-100 text-sm leading-relaxed">
                                        ¿Buscas optimizar tus procesos? Solicita una propuesta de consultoría personalizada.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="relative pt-2 p-6">
                                    <Button
                                        onClick={handleRequestProposal}
                                        disabled={requesting}
                                        className="w-full bg-malachite text-dark-green hover:bg-jade h-14 text-lg font-black flex items-center gap-2 group transition-all shadow-lg shadow-indigo-900/40"
                                    >
                                        {requesting ? "Enviando..." : "Solicitar Propuesta"}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
