"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Calendar, Network, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { formatDate, formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Props {
    proposals: any[];
}

export function ProposalsPanel({ proposals }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [reporterFilter, setReporterFilter] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [yearFilter, setYearFilter] = useState<string>("all");
    const [expandedTraceKey, setExpandedTraceKey] = useState<string | null>(null);

    const uniqueStatuses = useMemo(() => {
        return Array.from(new Set(proposals.map(p => p.status))).sort();
    }, [proposals]);

    const uniqueYears = useMemo(() => {
        return Array.from(new Set(proposals.map(p => new Date(p.createdDate).getFullYear()))).sort((a, b) => b - a);
    }, [proposals]);

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const matchesSearch = searchTerm === "" ||
                p.issueKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.issueSummary.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(p.status);
            const matchesReporter = reporterFilter === "" || (p.reporter || "").toLowerCase().includes(reporterFilter.toLowerCase());
            const matchesAssignee = assigneeFilter === "" || (p.assignee || "").toLowerCase().includes(assigneeFilter.toLowerCase());

            const date = new Date(p.createdDate);
            const matchesMonth = monthFilter === "all" || (date.getMonth() + 1).toString() === monthFilter;
            const matchesYear = yearFilter === "all" || date.getFullYear().toString() === yearFilter;

            return matchesSearch && matchesStatus && matchesReporter && matchesAssignee && matchesMonth && matchesYear;
        });
    }, [proposals, searchTerm, statusFilter, reporterFilter, assigneeFilter, monthFilter, yearFilter]);

    const toggleStatus = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const toggleTrace = (key: string) => {
        setExpandedTraceKey(prev => prev === key ? null : key);
    };

    return (
        <Card className="mt-8 border-t-4 border-t-amber-500 shadow-lg">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Filter className="w-5 h-5 text-amber-600" />
                    Peticiones de Evolutivo
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Búsqueda</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Ticket o descripción..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white dark:bg-slate-950"
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
                                    {uniqueYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
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

                    <div className="md:col-span-3 lg:col-span-4 space-y-2 pt-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estados ({statusFilter.length || 'Todos'})</Label>
                        <div className="flex flex-wrap gap-2">
                            {uniqueStatuses.map(status => (
                                <Badge
                                    key={status}
                                    variant={statusFilter.includes(status) ? "default" : "outline"}
                                    className={`cursor-pointer transition-colors ${statusFilter.includes(status) ? 'bg-amber-600 hover:bg-amber-700' : 'hover:bg-slate-100'}`}
                                    onClick={() => toggleStatus(status)}
                                >
                                    {status}
                                </Badge>
                            ))}
                            {statusFilter.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setStatusFilter([])} className="h-6 px-2 text-[10px]">
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                            <TableRow>
                                <TableHead className="font-bold">Ticket</TableHead>
                                <TableHead className="font-bold">Descripción</TableHead>
                                <TableHead className="font-bold">Creado</TableHead>
                                <TableHead className="font-bold">Estado</TableHead>
                                <TableHead className="font-bold">Componente</TableHead>
                                <TableHead className="font-bold">Informador</TableHead>
                                <TableHead className="font-bold">Responsable</TableHead>
                                <TableHead className="font-bold text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">
                                        No se encontraron peticiones coincidentes con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((p) => {
                                    const related = p.relatedTickets ? JSON.parse(p.relatedTickets) : [];

                                    return (
                                        <TableRow key={p.issueKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                            <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{p.issueKey}</TableCell>
                                            <TableCell className="max-w-xs font-medium">
                                                <div className="line-clamp-2" title={p.issueSummary}>
                                                    {p.issueSummary}
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-slate-500">
                                                {formatShortDate(p.createdDate)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className={cn(
                                                        "w-fit truncate",
                                                        p.status.toUpperCase() === 'CERRADO' || p.status.toUpperCase() === 'FINALIZADO' || p.status.toUpperCase() === 'DONE'
                                                            ? "border-slate-300 text-slate-600 bg-slate-100"
                                                            : "border-amber-200 text-amber-700 bg-amber-50"
                                                    )}>
                                                        {p.status}
                                                    </Badge>
                                                    {(p.status.toUpperCase() === 'CERRADO' || p.status.toUpperCase() === 'FINALIZADO' || p.status.toUpperCase() === 'DONE') && p.resolution && (
                                                        <span className={cn(
                                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border w-fit",
                                                            p.resolution.toLowerCase().includes('aprobado') ||
                                                                p.resolution.toLowerCase().includes('fixed') ||
                                                                p.resolution.toLowerCase().includes('resuelto') ||
                                                                p.resolution.toLowerCase().includes('done')
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-red-50 text-red-700 border-red-200"
                                                        )}>
                                                            {p.resolution}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">
                                                {p.components || '-'}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{p.reporter || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleTrace(p.issueKey)}
                                                    className={cn(
                                                        "gap-2 transition-all",
                                                        expandedTraceKey === p.issueKey
                                                            ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
                                                            : "hover:border-amber-400 hover:text-amber-600"
                                                    )}
                                                >
                                                    <Network className="w-4 h-4" />
                                                    Trazabilidad
                                                    {expandedTraceKey === p.issueKey ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Detailed Traceability Section */}
                {expandedTraceKey && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        {(() => {
                            const selected = proposals.find(p => p.issueKey === expandedTraceKey);
                            if (!selected) return null;
                            const related = selected.relatedTickets ? JSON.parse(selected.relatedTickets) : [];

                            return (
                                <Card className="border-2 border-amber-200 bg-amber-50/20 overflow-hidden shadow-inner">
                                    <CardHeader className="bg-amber-50/50 py-3 border-b border-amber-100 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                            <Network className="w-4 h-4" />
                                            Flujo de Trazabilidad: {selected.issueKey}
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setExpandedTraceKey(null)} className="h-8 w-8 p-0 text-amber-700 hover:bg-amber-100">
                                            ×
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 lg:gap-8">
                                            {/* Source Proposal */}
                                            <div className="relative group flex flex-col items-center">
                                                <div className="z-10 bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-md w-64 transform transition-transform group-hover:scale-105">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <Badge className="bg-amber-500">{selected.issueKey}</Badge>
                                                        <span className="text-[10px] text-slate-400 font-mono">ORIGEN</span>
                                                    </div>
                                                    <p className="text-xs font-bold line-clamp-2 mb-3 min-h-[2rem]">{selected.issueSummary}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                        <Clock className="w-3 h-3" />
                                                        Sincronizado: {formatShortDate(selected.lastSyncedAt)}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-center">
                                                    <span className="text-[10px] font-bold text-amber-600 block">CREADO</span>
                                                    <span className="text-xs font-medium">{formatShortDate(selected.createdDate)}</span>
                                                </div>
                                            </div>

                                            {/* Connector / Arrow */}
                                            <div className="flex flex-col items-center text-amber-400">
                                                <ArrowRight className="w-8 h-8 hidden md:block" />
                                                <ChevronDown className="w-8 h-8 md:hidden" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Aceptación</span>
                                            </div>

                                            {/* Destination Tickets */}
                                            <div className="flex flex-col gap-4">
                                                {related.length > 0 ? (
                                                    related.map((r: any) => (
                                                        <div key={r.key} className="relative group flex flex-col items-center md:items-start">
                                                            <div className="z-10 bg-white dark:bg-slate-900 border-2 border-jade rounded-2xl p-4 shadow-md w-64 transform transition-transform group-hover:scale-105">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <Badge className="bg-jade">{r.key}</Badge>
                                                                    <div className="flex items-center gap-1 text-jade">
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        <span className="text-[10px] font-bold">VINCULADO</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 italic mb-1">Ticket de continuidad generado automáticamente.</p>
                                                                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-end">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Aceptado el</span>
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                            {r.created ? formatShortDate(r.created) : 'Pendiente'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 rounded-2xl p-8 shadow-sm w-64 flex flex-col items-center justify-center text-center opacity-60">
                                                        <Clock className="w-8 h-8 text-slate-300 mb-2" />
                                                        <p className="text-xs font-bold text-slate-400">SIN VÍNCULO</p>
                                                        <p className="text-[10px] text-slate-300 mt-1">Esta petición aún no ha generado un ticket de evolutivo.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })()}
                    </div>
                )}
                <div className="mt-4 text-xs text-slate-400 flex justify-between items-center">
                    <span>Mostrando {filteredProposals.length} de {proposals.length} peticiones</span>
                    <span className="flex items-center gap-1 italic">
                        <Calendar className="w-3 h-3" />
                        Fechas en formato DD/MM/AAAA
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
