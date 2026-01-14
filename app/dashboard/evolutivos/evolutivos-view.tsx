"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getEvolutivosByClient, syncClientEvolutivos } from "@/app/actions/evolutivos";
import { EvolutivoTimeline } from "./components/evolutivo-timeline";
import { ProposalsPanel } from "@/app/evolutivos/components/proposals-panel";
import { Briefcase, Calendar, User, Search, Loader2, RefreshCw, AlertCircle, Filter, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatShortDate, formatDate } from "@/lib/date-utils";

interface Props {
    user: any;
    clients: any[];
    initialData: any;
    isAdmin: boolean;
    initialClientId: string;
    permissions: Record<string, boolean>;
}

export function EvolutivosView({ user, clients, initialData, isAdmin, initialClientId, permissions }: Props) {
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [data, setData] = useState(initialData);
    const [selectedEvolutivoKey, setSelectedEvolutivoKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [monthFilter, setMonthFilter] = useState("all");
    const [yearFilter, setYearFilter] = useState("all");
    const [reporterFilter, setReporterFilter] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("");

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

    const toggleStatus = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const filteredEvolutivos = useMemo(() => {
        return data.evolutivos.filter((evo: any) => {
            const matchesSearch = searchTerm === "" ||
                evo.issueKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
                evo.issueSummary.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(evo.status);

            const matchesReporter = reporterFilter === "" ||
                (evo.reporter || "").toLowerCase().includes(reporterFilter.toLowerCase());

            const matchesAssignee = assigneeFilter === "" ||
                (evo.assignee || "").toLowerCase().includes(assigneeFilter.toLowerCase());

            // Date processing
            const created = new Date(evo.createdDate);
            const matchesMonth = monthFilter === "all" || (created.getMonth() + 1).toString() === monthFilter;
            const matchesYear = yearFilter === "all" || created.getFullYear().toString() === yearFilter;

            return matchesSearch && matchesStatus && matchesReporter && matchesAssignee && matchesMonth && matchesYear;
        });
    }, [data.evolutivos, searchTerm, statusFilter, reporterFilter, assigneeFilter, monthFilter, yearFilter]);

    const uniqueStatuses = useMemo(() => {
        return Array.from(new Set(data.evolutivos.map((e: any) => e.status))).sort();
    }, [data.evolutivos]);

    const uniqueYears = useMemo(() => {
        return Array.from(new Set(data.evolutivos.map((e: any) => new Date(e.createdDate).getFullYear()))).sort((a: any, b: any) => (b as number) - (a as number));
    }, [data.evolutivos]);

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
                        <div className="flex items-center gap-3">
                            <div className="bg-jade/10 text-jade px-4 py-2 rounded-lg flex items-center gap-2 border border-jade/20">
                                <Briefcase className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase tracking-wider">{user?.role}</span>
                            </div>
                            {!isAdmin && !user.permissions?.view_all_clients && (
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="flex items-center gap-2 bg-jade text-white px-4 py-2 rounded-lg hover:bg-jade/90 transition-all font-bold text-sm shadow-sm hover:shadow-md disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                    <span>{syncing ? 'Sincronizando...' : 'Actualizar Datos'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Búsqueda</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Ticket o descripción..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white dark:bg-slate-950"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha Creación (Mes / Año)</Label>
                            <div className="flex gap-2">
                                <Select value={monthFilter} onValueChange={setMonthFilter}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Mes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Cualquier mes</SelectItem>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                {formatDate(new Date(2024, i, 1), { month: 'long' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={yearFilter} onValueChange={setYearFilter}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950">
                                        <SelectValue placeholder="Año" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Cualquier año</SelectItem>
                                        {(uniqueYears as any[]).map((year: any) => (
                                            <SelectItem key={year.toString()} value={year.toString()}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Informador / Solicitante</Label>
                            <Input
                                placeholder="Nombre informador..."
                                value={reporterFilter}
                                onChange={(e) => setReporterFilter(e.target.value)}
                                className="bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Responsable / Assignee</Label>
                            <Input
                                placeholder="Nombre responsable..."
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="bg-white dark:bg-slate-950"
                            />
                        </div>

                        <div className="lg:col-span-4 space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                                Estados <span>{statusFilter.length > 0 && `(${statusFilter.length} seleccionados)`}</span>
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant={statusFilter.length === 0 ? "default" : "outline"}
                                    className={`cursor-pointer transition-colors ${statusFilter.length === 0 ? 'bg-jade hover:bg-jade/80' : 'hover:bg-slate-100'}`}
                                    onClick={() => setStatusFilter([])}
                                >
                                    Todos
                                </Badge>
                                {uniqueStatuses.map((status: any) => (
                                    <Badge
                                        key={status}
                                        variant={statusFilter.includes(status) ? "default" : "outline"}
                                        className={`cursor-pointer transition-colors ${statusFilter.includes(status) ? 'bg-jade hover:bg-jade/80' : 'hover:bg-slate-100'}`}
                                        onClick={() => toggleStatus(status)}
                                    >
                                        {status}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {(isAdmin || user.permissions?.view_all_clients) && clients.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="client-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between items-center">
                                    Cliente
                                    {selectedClientId && (isAdmin || permissions.manage_evolutivos) && (
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

                        <div className={`space-y-2 ${(isAdmin || user.permissions?.view_all_clients) ? '' : 'md:col-span-2'}`}>
                            <Label htmlFor="evolutivo-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex justify-between">
                                Evolutivo Activo
                                {filteredEvolutivos.length > 0 && <span className="text-jade font-bold">{filteredEvolutivos.length} encontrados</span>}
                            </Label>
                            <Select
                                value={selectedEvolutivoKey}
                                onValueChange={setSelectedEvolutivoKey}
                                disabled={loading || filteredEvolutivos.length === 0}
                            >
                                <SelectTrigger id="evolutivo-select" className="bg-jade/5 border-jade/20 focus:ring-jade h-12">
                                    <SelectValue placeholder={data.evolutivos.length === 0 ? "No hay evolutivos para este cliente" : filteredEvolutivos.length === 0 ? "Ningún evolutivo coincide con los filtros" : "Seleccionar evolutivo..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredEvolutivos.map((e: any) => (
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
