"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/app/dashboard/components/dashboard-view";
import { Calendar, ArrowRight, Building2, LayoutDashboard, History, Zap, TrendingUp, Info } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";
import { getWorkPackages } from "@/app/actions/work-packages";
import { getMyNotifications, markNotificationAsRead } from "@/app/actions/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Props = {
    user: any;
    clients: any[];
    permissions: Record<string, boolean>;
    isAdmin?: boolean;
};

export function ManagerDashboardView({ user, clients, permissions, isAdmin = false }: Props) {
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [selectedWpId, setSelectedWpId] = useState<string>("");
    const [showDashboard, setShowDashboard] = useState(false);
    const [workPackages, setWorkPackages] = useState<any[]>([]);
    const [isLoadingWPs, setIsLoadingWPs] = useState(false);

    // Renewal popup state
    const [showRenewalPopup, setShowRenewalPopup] = useState(false);
    const [renewalData, setRenewalData] = useState<any>(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

    // Fetch WPs when client changes
    useEffect(() => {
        if (selectedClientId) {
            setIsLoadingWPs(true);
            setSelectedWpId("");
            setSelectedPeriodId(null);
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
            setSelectedPeriodId(null);
        }
    }, [selectedClientId]);

    // Detect unread renewal notifications for the Manager
    useEffect(() => {
        if (user?.id) {
            getMyNotifications(user.id).then(notifs => {
                const renewalNotif = notifs.find(n => n.type === 'CONTRACT_RENEWED' && !n.isRead);
                if (renewalNotif) {
                    const wpId = renewalNotif.relatedId;
                    if (wpId) {
                        import("@/app/actions/work-packages").then(mod => {
                            mod.getWorkPackageById(wpId).then(wp => {
                                if (wp && wp.validityPeriods.length >= 2) {
                                    setRenewalData({
                                        notificationId: renewalNotif.id,
                                        wpName: wp.name,
                                        newPeriod: wp.validityPeriods[0],
                                        oldPeriod: wp.validityPeriods[1]
                                    });
                                    setShowRenewalPopup(true);
                                }
                            });
                        });
                    }
                }
            });
        }
    }, [user?.id]);

    const handleCloseRenewalPopup = async () => {
        if (renewalData?.notificationId) {
            await markNotificationAsRead(renewalData.notificationId);
        }
        setShowRenewalPopup(false);
        setRenewalData(null);
    };

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
                    isAdmin={isAdmin}
                    isPremium={user.isPremium || false}
                />
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-100 p-8 min-h-screen">
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
                                const now = new Date();
                                const periods = [...(selectedWP as any).validityPeriods].sort((a: any, b: any) =>
                                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                                );

                                const currentActualPeriod = periods.find((vp: any) =>
                                    new Date(vp.startDate) <= now && new Date(vp.endDate) >= now
                                ) || periods[0];

                                const displayPeriod = selectedPeriodId
                                    ? periods.find((p: any) => p.id === selectedPeriodId)
                                    : currentActualPeriod;

                                return (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <History className="w-4 h-4 text-malachite" />
                                                Ficha del Servicio y Vigencias
                                            </h3>
                                            <Badge variant="outline" className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {periods.length} Períodos registrados
                                            </Badge>
                                        </div>

                                        {/* Visual Timeline / Periods Grid */}
                                        <div className="p-6">
                                            <div className="flex gap-4 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                                                {periods.map((period: any, idx: number) => {
                                                    const isCurrent = period.id === currentActualPeriod?.id;
                                                    const isSelected = period.id === displayPeriod?.id;
                                                    const isPast = new Date(period.endDate) < now;

                                                    return (
                                                        <button
                                                            key={period.id}
                                                            onClick={() => setSelectedPeriodId(period.id)}
                                                            className={`flex-shrink-0 w-48 text-left p-4 rounded-xl border-2 transition-all hover:border-malachite/50 ${isSelected
                                                                ? 'border-malachite bg-malachite/5 ring-4 ring-malachite/10'
                                                                : 'border-slate-50 bg-slate-50/30'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${isCurrent ? 'bg-malachite text-white' : 'bg-slate-200 text-slate-500'
                                                                    }`}>
                                                                    {isCurrent ? 'Actual' : isPast ? 'Pasado' : 'Próximo'}
                                                                </span>
                                                                <p className="text-[10px] font-bold text-slate-400">
                                                                    #{periods.length - idx}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700 mb-1">
                                                                {formatDate(period.startDate, { month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <span>{formatDate(period.startDate, { day: '2-digit', month: '2-digit' })}</span>
                                                                <ArrowRight className="w-2 h-2" />
                                                                <span>{formatDate(period.endDate, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* characteristics of current/selected period */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50 relative">
                                                <div className="absolute -top-3 left-6 px-2 bg-white text-[10px] font-black text-malachite uppercase tracking-widest border border-slate-100 rounded">
                                                    Detalles Periodo {displayPeriod?.id === currentActualPeriod?.id ? 'Vigente' : 'Seleccionado'}
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Modalidad</p>
                                                    <p className="text-sm text-slate-700 font-bold">{selectedWP.contractType}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Facturación</p>
                                                    <p className="text-sm text-slate-700 font-bold">{selectedWP.billingType}</p>
                                                </div>
                                                {permissions.view_costs && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Tarifa Base</p>
                                                        <p className="text-sm text-slate-700 font-bold">{displayPeriod?.rate.toFixed(2)}€ / {displayPeriod?.scopeUnit === 'HORAS' ? 'h' : 'u'}</p>
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Volumen</p>
                                                    <p className="text-sm text-slate-700 font-bold">{displayPeriod?.totalQuantity} {displayPeriod?.scopeUnit}</p>
                                                </div>

                                                <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 border-t border-slate-200/50 mt-2">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Regularización</p>
                                                        <p className="text-sm text-slate-700 font-bold">{displayPeriod?.regularizationType || 'N/A'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Excedentes</p>
                                                        <p className="text-sm text-slate-700 font-bold">{displayPeriod?.surplusStrategy || 'Estándar'}</p>
                                                    </div>
                                                    {permissions.view_costs && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Tarifa Evolutivo</p>
                                                            <p className="text-sm text-slate-700 font-bold">{displayPeriod?.rateEvolutivo ? `${displayPeriod.rateEvolutivo.toFixed(2)}€` : 'Misma tarifa'}</p>
                                                        </div>
                                                    )}
                                                    {permissions.view_costs && (
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Premium / Plus</p>
                                                            <p className="text-sm text-slate-700 font-bold">{displayPeriod?.isPremium ? `Sí (${displayPeriod.premiumPrice}€)` : 'No'}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
                            {(permissions.view_evolutivos_admin || isAdmin) && (
                                <Link href="/evolutivos">
                                    <Button className="w-full bg-white text-orange-600 hover:bg-orange-50 h-14 text-lg font-bold flex items-center gap-2 group transition-all shadow-lg shadow-orange-900/20">
                                        Ir al Centro de Trabajo
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </Link>
                            )}
                            {!isAdmin && !permissions.view_evolutivos_admin && permissions.view_evolutivos_client && (
                                <Link href="/dashboard/evolutivos">
                                    <Button className="w-full bg-white text-orange-600 hover:bg-orange-50 h-14 text-lg font-bold flex items-center gap-2 group transition-all shadow-lg shadow-orange-900/20">
                                        Ir al Centro de Trabajo
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Renewal Comparison Popup */}
            <Dialog open={showRenewalPopup} onOpenChange={setShowRenewalPopup}>
                <DialogContent className="max-w-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md p-0 overflow-hidden">
                    <div className="bg-malachite p-6 text-white relative">
                        <Zap className="absolute top-4 right-4 h-12 w-12 opacity-20" />
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black flex items-center gap-2">
                                <TrendingUp className="h-6 w-6" />
                                CONTRATO RENOVADO
                            </DialogTitle>
                            <DialogDescription className="text-malachite-foreground/80 font-medium">
                                Se han actualizado las condiciones del servicio para {renewalData?.wpName}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Periodo Anterior</p>
                                <p className="text-sm font-bold text-slate-600">
                                    {renewalData?.oldPeriod ? formatDate(renewalData.oldPeriod.endDate, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                </p>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-300" />
                            <div>
                                <p className="text-[10px] text-malachite font-black uppercase tracking-widest mb-1">Nuevo Periodo</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {renewalData?.newPeriod ? formatDate(renewalData.newPeriod.endDate, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Cambios en Tarifa
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-500">Tarifa Base</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 line-through">{renewalData?.oldPeriod?.rate.toFixed(2)}€</span>
                                            <span className="text-sm font-bold text-slate-900">{renewalData?.newPeriod?.rate.toFixed(2)}€</span>
                                        </div>
                                    </div>
                                    {renewalData?.newPeriod?.rate > renewalData?.oldPeriod?.rate && (
                                        <div className="bg-malachite/10 px-3 py-1 rounded-full w-fit">
                                            <span className="text-[10px] font-bold text-malachite-dark flex items-center gap-1">
                                                <TrendingUp className="h-2.5 w-2.5" />
                                                +{((renewalData.newPeriod.rate / renewalData.oldPeriod.rate - 1) * 100).toFixed(1)}% incremento
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Volumen Contratado
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-500">{renewalData?.newPeriod?.scopeUnit}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 line-through">{renewalData?.oldPeriod?.totalQuantity}</span>
                                            <span className="text-sm font-bold text-slate-900">{renewalData?.newPeriod?.totalQuantity}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold text-slate-400">
                                        {renewalData?.newPeriod?.regularizationType || 'Sin regularización'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t items-center sm:justify-between gap-4">
                        <p className="text-[10px] text-slate-400 max-w-[280px]">
                            Al cerrar este aviso se marcará como leído y no volverá a aparecer.
                        </p>
                        <Button
                            onClick={handleCloseRenewalPopup}
                            className="bg-slate-900 hover:bg-black px-8 font-bold"
                        >
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
