"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEvolutivosByClient, syncClientEvolutivos } from "@/app/actions/evolutivos";
import { EvolutivoTimeline } from "./evolutivo-timeline";
import { ProposalsPanel } from "./proposals-panel";
import { RefreshCw, Search, Eye, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
    user: any;
    clients: any[];
    initialData: any;
    isAdmin: boolean;
    initialClientId: string;
    permissions: Record<string, boolean>;
}

export function EvolutivosTableView({ user, clients, initialData, isAdmin, initialClientId, permissions }: Props) {
    const [selectedClientId, setSelectedClientId] = useState(initialClientId);
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [billingFilter, setBillingFilter] = useState("all");
    const [selectedEvolutivo, setSelectedEvolutivo] = useState<any>(null);
    const [timelineOpen, setTimelineOpen] = useState(false);

    const currentClient = useMemo(() => {
        return clients.find((c: any) => c.id === selectedClientId);
    }, [clients, selectedClientId]);

    const handleClientChange = async (clientId: string) => {
        setSelectedClientId(clientId);
        setLoading(true);
        const newData = await getEvolutivosByClient(clientId);
        setData(newData);
        setLoading(false);
    };

    const handleSync = async () => {
        if (!selectedClientId) return;
        setSyncing(true);
        const res = await syncClientEvolutivos(selectedClientId);
        if (res.success) {
            toast.success((res as any).message);
            const newData = await getEvolutivosByClient(selectedClientId);
            setData(newData);
        } else {
            toast.error((res as any).error || (res as any).message || "Error al sincronizar");
        }
        setSyncing(false);
    };

    const handleViewPlan = (evolutivo: any) => {
        setSelectedEvolutivo(evolutivo);
        setTimelineOpen(true);
    };

    // Filter evolutivos
    const filteredEvolutivos = useMemo(() => {
        return data.evolutivos.filter((evo: any) => {
            const matchesSearch = searchTerm === "" ||
                evo.issueKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
                evo.issueSummary.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(evo.status);
            const matchesBilling = billingFilter === "all" || evo.billingMode === billingFilter;

            return matchesSearch && matchesStatus && matchesBilling;
        });
    }, [data.evolutivos, searchTerm, statusFilter, billingFilter]);

    const uniqueStatuses = useMemo(() => {
        return Array.from(new Set(data.evolutivos.map((e: any) => e.status))).sort();
    }, [data.evolutivos]);

    const uniqueBillingModes = useMemo(() => {
        return Array.from(new Set(data.evolutivos.map((e: any) => e.billingMode))).filter(Boolean).sort();
    }, [data.evolutivos]);

    return (
        <>
            <Card className="border-t-4 border-t-jade mb-6">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>Evolutivos Sincronizados</CardTitle>
                        <div className="flex items-center gap-2">
                            {(isAdmin || user.permissions?.view_all_clients || clients.length > 1) && clients.length > 0 && (
                                <Select value={selectedClientId} onValueChange={handleClientChange}>
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Seleccionar cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {(isAdmin || permissions.manage_evolutivos) && selectedClientId && (
                                <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                    Sincronizar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="md:col-span-2">
                            <Label htmlFor="search">Buscar</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    id="search"
                                    placeholder="Buscar por ticket o resumen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="status-filter">Estado</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal" id="status-filter">
                                        <span className="truncate">
                                            {statusFilter.length === 0
                                                ? "Todos"
                                                : statusFilter.length === 1
                                                    ? statusFilter[0]
                                                    : `${statusFilter.length} seleccionados`}
                                        </span>
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[200px]">
                                    <DropdownMenuCheckboxItem
                                        checked={statusFilter.length === 0}
                                        onCheckedChange={() => setStatusFilter([])}
                                    >
                                        Todos
                                    </DropdownMenuCheckboxItem>
                                    <div className="h-px bg-slate-100 my-1" />
                                    {uniqueStatuses.map((status: any) => (
                                        <DropdownMenuCheckboxItem
                                            key={status}
                                            checked={statusFilter.includes(status)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setStatusFilter([...statusFilter, status]);
                                                } else {
                                                    setStatusFilter(statusFilter.filter(s => s !== status));
                                                }
                                            }}
                                        >
                                            {status}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div>
                            <Label htmlFor="billing-filter">Modo Facturación</Label>
                            <Select value={billingFilter} onValueChange={setBillingFilter}>
                                <SelectTrigger id="billing-filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {uniqueBillingModes.map((mode: any) => (
                                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-jade" />
                        </div>
                    ) : filteredEvolutivos.length === 0 ? (
                        <div className="text-center p-12 text-slate-500">
                            <p>No se encontraron evolutivos con los filtros seleccionados.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket</TableHead>
                                        <TableHead>Resumen</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Modo Facturación</TableHead>
                                        <TableHead className="text-right">Estimación/Horas</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEvolutivos.map((evo: any) => (
                                        <TableRow key={evo.issueKey}>
                                            <TableCell className="font-medium">{evo.issueKey}</TableCell>
                                            <TableCell className="max-w-md truncate">{evo.issueSummary}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{evo.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{evo.billingMode || 'N/A'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {evo.accumulatedHours > 0
                                                    ? `${evo.accumulatedHours.toFixed(2)}h`
                                                    : evo.originalEstimate
                                                        ? `${evo.originalEstimate.toFixed(2)}h (est.)`
                                                        : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button onClick={() => handleViewPlan(evo)} size="sm" variant="ghost">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver Plan
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="mt-4 text-sm text-slate-500">
                        Mostrando {filteredEvolutivos.length} de {data.evolutivos.length} evolutivos
                    </div>
                </CardContent>
            </Card>

            <ProposalsPanel proposals={data.proposals || []} />

            <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Plan de Evolutivo: {selectedEvolutivo?.issueKey}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedEvolutivo && (
                        <EvolutivoTimeline
                            evolutivo={selectedEvolutivo}
                            hitos={data.hitos.filter((h: any) => h.parentKey === selectedEvolutivo.issueKey)}
                            isAdmin={isAdmin}
                            portalUrl={currentClient?.portalUrl || null}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
