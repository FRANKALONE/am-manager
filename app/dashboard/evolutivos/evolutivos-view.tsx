"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getEvolutivosByClient, syncClientEvolutivos } from "@/app/actions/evolutivos";
import { EvolutivoTimeline } from "./components/evolutivo-timeline";
import { ProposalsPanel } from "@/app/evolutivos/components/proposals-panel";
import { Briefcase, Calendar, User, Search, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
    user: any;
    clients: any[];
    initialData: any;
    isAdmin: boolean;
    initialClientId: string;
}

export function EvolutivosView({ user, clients, initialData, isAdmin, initialClientId }: Props) {
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [data, setData] = useState(initialData);
    const [selectedEvolutivoKey, setSelectedEvolutivoKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const currentClient = useMemo(() => {
        return clients.find((c: any) => c.id === selectedClientId);
    }, [clients, selectedClientId]);

    // Refresh data when client changes
    useEffect(() => {
        if (selectedClientId && selectedClientId !== initialClientId) {
            handleClientChange(selectedClientId);
        }
    }, [selectedClientId]);

    const handleClientChange = async (clientId: string) => {
        setLoading(true);
        const newData = await getEvolutivosByClient(clientId);
        setData(newData);
        setSelectedEvolutivoKey("");
        setLoading(false);
    };

    const handleSync = async () => {
        if (!selectedClientId) return;
        setSyncing(true);
        const res = await syncClientEvolutivos(selectedClientId);
        if (res.success) {
            toast.success((res as any).message);
            // Refresh data for current client
            const newData = await getEvolutivosByClient(selectedClientId);
            setData(newData);
        } else {
            toast.error((res as any).error || (res as any).message || "Error al sincronizar");
        }
        setSyncing(false);
    };

    const selectedEvolutivo = useMemo(() => {
        return data.evolutivos.find((e: any) => e.issueKey === selectedEvolutivoKey);
    }, [data.evolutivos, selectedEvolutivoKey]);

    return (
        <div className="space-y-6">
            {/* Header & Client Selector */}
            <Card className="border-t-4 border-t-jade">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900">Centro de Gestión de Evolutivos</CardTitle>
                            <CardDescription>Seguimiento detallado de hitos y planificación de evolutivos.</CardDescription>
                        </div>
                        <div className="bg-jade/10 text-jade px-4 py-2 rounded-lg flex items-center gap-2 border border-jade/20">
                            <Briefcase className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">{user?.role}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {(isAdmin || user.permissions?.view_all_clients) && clients.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="client-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between items-center">
                                    Cliente
                                    {selectedClientId && (
                                        <button
                                            onClick={handleSync}
                                            disabled={syncing}
                                            className="flex items-center gap-1 text-jade hover:text-jade/80 transition-colors disabled:opacity-50"
                                            title="Sincronizar este cliente de JIRA"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                                            <span className="text-[10px] font-bold uppercase">Sincronizar Cliente</span>
                                        </button>
                                    )}
                                </Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger id="client-select" className="bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Seleccionar cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="evolutivo-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                                Evolutivo Activo
                                {data.evolutivos.length > 0 && <span className="text-jade font-bold">{data.evolutivos.length} encontrados</span>}
                            </Label>
                            <Select
                                value={selectedEvolutivoKey}
                                onValueChange={setSelectedEvolutivoKey}
                                disabled={loading || data.evolutivos.length === 0}
                            >
                                <SelectTrigger id="evolutivo-select" className="bg-jade/5 border-jade/20 focus:ring-jade">
                                    <SelectValue placeholder={data.evolutivos.length === 0 ? "No hay evolutivos para este cliente" : "Seleccionar evolutivo..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.evolutivos.map((e: any) => (
                                        <SelectItem key={e.issueKey} value={e.issueKey}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{e.issueKey}</span>
                                                <span className="mx-2 text-slate-300">|</span>
                                                <span className="text-xs truncate max-w-[200px]">{e.issueSummary}</span>
                                                {e.pendingPlanning && (
                                                    <AlertCircle className="w-3 h-3 text-amber-500 ml-2" />
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <Loader2 className="w-10 h-10 text-jade animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Cargando datos del cliente...</p>
                </div>
            ) : !selectedEvolutivo ? (
                <Card className="border-none shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center p-20 text-center">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                            <Search className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600 mb-2">No se ha seleccionado ningún evolutivo</h3>
                        <p className="text-slate-400 max-w-sm">
                            Elige un evolutivo del selector superior para visualizar su planificación, hitos y responsables asignados.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    <EvolutivoTimeline
                        evolutivo={selectedEvolutivo}
                        hitos={data.hitos.filter((h: any) => h.parentKey === selectedEvolutivo.issueKey)}
                        isAdmin={isAdmin}
                        portalUrl={currentClient?.portalUrl || null}
                    />

                </div>
            )}

            {data.proposals && data.proposals.length > 0 && (
                <ProposalsPanel proposals={data.proposals} />
            )}
        </div>
    );
}
