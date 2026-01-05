"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/app/dashboard/components/dashboard-view";
import { Calendar, ArrowRight, Building2, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { getWorkPackages } from "@/app/actions/work-packages";

type Props = {
    user: any;
    clients: any[];
    permissions: Record<string, boolean>;
};

export function ManagerDashboardView({ user, clients, permissions }: Props) {
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [selectedWpId, setSelectedWpId] = useState<string>("");
    const [showDashboard, setShowDashboard] = useState(false);
    const [workPackages, setWorkPackages] = useState<any[]>([]);
    const [isLoadingWPs, setIsLoadingWPs] = useState(false);

    // Fetch WPs when client changes
    useEffect(() => {
        if (selectedClientId) {
            setIsLoadingWPs(true);
            setSelectedWpId("");
            getWorkPackages({ clientId: selectedClientId, status: "all" })
                .then(wps => {
                    setWorkPackages(wps);
                    setIsLoadingWPs(false);
                })
                .catch(err => {
                    console.error("Error fetching WPs:", err);
                    setWorkPackages([]);
                    setIsLoadingWPs(false);
                });
        } else {
            setWorkPackages([]);
            setSelectedWpId("");
        }
    }, [selectedClientId]);

    const selectedWP = workPackages.find(wp => wp.id === selectedWpId);
    const selectedClient = clients.find(c => c.id === selectedClientId);

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
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 flex gap-4">
                        <span className="text-sm font-semibold text-blue-900">
                            Cliente: {selectedClient?.name}
                        </span>
                        <span className="text-sm font-semibold text-blue-900 border-l border-blue-200 pl-4">
                            Analizando: {selectedWP.name} ({selectedWP.id})
                        </span>
                    </div>
                </div>

                <DashboardView
                    clients={clients}
                    permissions={permissions}
                    userId={user.id}
                    initialClientId={selectedClientId}
                    initialWpId={selectedWP.id}
                    readOnly={true}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">
                            Dashboard AM Gerentes
                        </h1>
                        <p className="text-slate-600">
                            Bienvenido, {user.name} {user.surname}
                        </p>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-malachite animate-pulse" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo Gerente</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="shadow-2xl md:col-span-2 border-none overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="bg-gradient-to-r from-dark-green to-jade text-white p-6">
                            <div className="flex items-center gap-3">
                                <LayoutDashboard className="w-6 h-6" />
                                <div>
                                    <CardTitle className="text-xl">Reporte de Consumos</CardTitle>
                                    <CardDescription className="text-jade-foreground/80 text-white/80">
                                        Gestiona los consumos de tus clientes asignados
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-8 p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label htmlFor="clientSelect" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-malachite" />
                                        1. Selecciona Cliente
                                    </Label>
                                    <select
                                        id="clientSelect"
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite transition-all cursor-pointer hover:border-malachite/50"
                                    >
                                        <option value="">-- Seleccionar Cliente --</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="wpSelect" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <LayoutDashboard className="w-4 h-4 text-malachite" />
                                        2. Selecciona Work Package
                                    </Label>
                                    <select
                                        id="wpSelect"
                                        value={selectedWpId}
                                        onChange={(e) => setSelectedWpId(e.target.value)}
                                        disabled={!selectedClientId || isLoadingWPs}
                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-malachite transition-all cursor-pointer hover:border-malachite/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {isLoadingWPs ? "Cargando..." : (selectedClientId ? "-- Seleccionar WP --" : "Primero elige un cliente")}
                                        </option>
                                        {workPackages.map(wp => (
                                            <option key={wp.id} value={wp.id}>
                                                {wp.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                            Detalles del Work Package
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Periodo de Vigencia</p>
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
                                    Abrir Dashboard Detallado
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl bg-gradient-to-br from-amber-500 to-orange-600 md:col-span-1 border-none text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Calendar className="w-32 h-32" />
                        </div>
                        <CardHeader className="relative p-6">
                            <CardTitle className="text-2xl flex items-center gap-2 mb-2">
                                <Calendar className="w-6 h-6" />
                                Evolutivos
                            </CardTitle>
                            <CardDescription className="text-orange-100 text-sm leading-relaxed">
                                Planificación, hitos y seguimiento de proyectos evolutivos de tus clientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative pt-4 p-6">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                                        <p className="text-sm">Visualiza cronogramas</p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                                        <p className="text-sm">Gestiona hitos críticos</p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                                        <p className="text-sm">Control de propuestas</p>
                                    </li>
                                </ul>
                            </div>
                            <Link href="/evolutivos">
                                <Button className="w-full bg-white text-orange-600 hover:bg-orange-50 h-14 text-lg font-bold flex items-center gap-2 group transition-all shadow-lg shadow-orange-900/20">
                                    Ir al Centro de Trabajo
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
