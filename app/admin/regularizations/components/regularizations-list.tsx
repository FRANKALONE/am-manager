"use client";

import { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ExternalLink, Plus, Filter } from "lucide-react";
import { DeleteRegularizationButton } from "./delete-button";
import { formatDate } from "@/lib/date-utils";

interface RegularizationsListProps {
    regularizations: any[];
}

// PHASE 2: Memoized row component to prevent unnecessary re-renders
const RegularizationRow = memo(({ reg, getTypeBadge }: { reg: any, getTypeBadge: (type: string) => JSX.Element }) => (
    <TableRow>
        <TableCell>
            {formatDate(reg.date, {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })}
        </TableCell>
        <TableCell className="font-medium">
            <Link href={`/admin/clients/${reg.workPackage.client.id}/edit`} className="hover:underline">
                {reg.workPackage.client.name}
            </Link>
        </TableCell>
        <TableCell>
            <Link href={`/admin/work-packages/${reg.workPackage.id}/edit`} className="hover:underline flex items-center gap-1 text-blue-600">
                {reg.workPackage.name}
                <ExternalLink className="w-3 h-3" />
            </Link>
        </TableCell>
        <TableCell>
            {getTypeBadge(reg.type)}
        </TableCell>
        <TableCell className="text-right font-bold w-[100px]">
            {Number(reg.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h
        </TableCell>
        <TableCell className="text-muted-foreground text-sm max-w-xs truncate" title={reg.description || ""}>
            {reg.description || "-"}
        </TableCell>
        <TableCell className="text-sm">
            {reg.ticketId || "-"}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
            {reg.createdByName || "-"}
        </TableCell>
        <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/regularizations/${reg.id}/edit`}>
                        Editar
                    </Link>
                </Button>
                <DeleteRegularizationButton id={reg.id} />
            </div>
        </TableCell>
    </TableRow>
));

RegularizationRow.displayName = 'RegularizationRow';


export function RegularizationsList({ regularizations }: RegularizationsListProps) {
    const [filters, setFilters] = useState({
        month: "all",
        year: "all",
        client: "all",
        workPackage: "all",
        type: "all",
        ticketId: ""
    });

    // PHASE 3: Debounced ticket ID search
    const [ticketIdInput, setTicketIdInput] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => {
            setFilters(prev => ({ ...prev, ticketId: ticketIdInput }));
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [ticketIdInput]);

    const getTypeBadge = useCallback((type: string) => {
        switch (type) {
            case "EXCESS":
                return <Badge variant="destructive">Exceso</Badge>;
            case "RETURN":
                return <Badge className="bg-green-600 hover:bg-green-700">Devolución</Badge>;
            case "SOBRANTE_ANTERIOR":
                return <Badge className="bg-blue-600 hover:bg-blue-700">Sobrante Anterior</Badge>;
            case "MANUAL_CONSUMPTION":
                return <Badge className="bg-blue-600 hover:bg-blue-700">Consumo Manual</Badge>;
            case "CONTRATACION_PUNTUAL":
                return <Badge className="bg-indigo-600 hover:bg-indigo-700">Contratación Puntual</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    }, []);

    // OPTIMIZATION 1: Pre-process date information once
    const processedRegularizations = useMemo(() => {
        return regularizations.map(reg => {
            const date = new Date(reg.date);
            return {
                ...reg,
                _month: String(date.getMonth() + 1).padStart(2, '0'),
                _year: String(date.getFullYear())
            };
        });
    }, [regularizations]);

    // OPTIMIZATION 2: Extract unique values in a single iteration
    const { uniqueClients, uniqueWorkPackages, uniqueMonths, uniqueYears } = useMemo(() => {
        const clients = new Map<string, boolean>();
        const wps = new Map<string, boolean>();
        const months = new Map<string, boolean>();
        const years = new Map<number, boolean>();

        for (const reg of processedRegularizations) {
            clients.set(reg.workPackage.client.name, true);
            wps.set(reg.workPackage.name, true);
            months.set(reg._month, true);
            years.set(parseInt(reg._year), true);
        }

        return {
            uniqueClients: Array.from(clients.keys()).sort(),
            uniqueWorkPackages: Array.from(wps.keys()).sort(),
            uniqueMonths: Array.from(months.keys()).sort(),
            uniqueYears: Array.from(years.keys()).sort((a, b) => b - a)
        };
    }, [processedRegularizations]);

    // OPTIMIZATION 3: Use pre-processed date fields for filtering
    const filteredRegularizations = useMemo(() => {
        return processedRegularizations.filter(reg => {
            if (filters.month !== "all" && reg._month !== filters.month) return false;
            if (filters.year !== "all" && reg._year !== filters.year) return false;
            if (filters.client !== "all" && reg.workPackage.client.name !== filters.client) return false;
            if (filters.workPackage !== "all" && reg.workPackage.name !== filters.workPackage) return false;
            if (filters.type !== "all" && reg.type !== filters.type) return false;
            if (filters.ticketId && !reg.ticketId?.toLowerCase().includes(filters.ticketId.toLowerCase())) return false;

            return true;
        });
    }, [processedRegularizations, filters]);

    // OPTIMIZATION 4: Use useCallback for filter updates
    const updateFilter = useCallback((key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({
            month: "all",
            year: "all",
            client: "all",
            workPackage: "all",
            type: "all",
            ticketId: ""
        });
        setTicketIdInput("");
    }, []);

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === "ticketId") return value !== "";
        return value !== "all";
    });

    // PHASE 2: Virtual scrolling setup
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: filteredRegularizations.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60, // Estimated row height in pixels
        overscan: 5 // Render 5 extra rows above and below viewport
    });

    return (
        <>
            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            <CardTitle>Filtros</CardTitle>
                        </div>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mes</label>
                            <Select value={filters.month} onValueChange={(v) => updateFilter('month', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {uniqueMonths.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Año</label>
                            <Select value={filters.year} onValueChange={(v) => updateFilter('year', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {uniqueYears.map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cliente</label>
                            <Select value={filters.client} onValueChange={(v) => updateFilter('client', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {uniqueClients.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Work Package</label>
                            <Select value={filters.workPackage} onValueChange={(v) => updateFilter('workPackage', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {uniqueWorkPackages.map(wp => (
                                        <SelectItem key={wp} value={wp}>{wp}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="EXCESS">Exceso</SelectItem>
                                    <SelectItem value="RETURN">Devolución</SelectItem>
                                    <SelectItem value="SOBRANTE_ANTERIOR">Sobrante Anterior</SelectItem>
                                    <SelectItem value="MANUAL_CONSUMPTION">Consumo Manual</SelectItem>
                                    <SelectItem value="CONTRATACION_PUNTUAL">Contratación Puntual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ticket ID</label>
                            <Input
                                placeholder="Buscar..."
                                value={ticketIdInput}
                                onChange={(e) => setTicketIdInput(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table with Virtual Scrolling */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado Global</CardTitle>
                    <CardDescription>
                        Mostrando {filteredRegularizations.length} de {regularizations.length} registros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        {/* Virtualized scrollable container */}
                        <div
                            ref={parentRef}
                            className="overflow-auto"
                            style={{ height: '600px' }}
                        >
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[100px] bg-white">Fecha</TableHead>
                                        <TableHead className="bg-white">Cliente</TableHead>
                                        <TableHead className="bg-white">Work Package</TableHead>
                                        <TableHead className="bg-white">Tipo</TableHead>
                                        <TableHead className="text-right w-[100px] bg-white">Cantidad</TableHead>
                                        <TableHead className="bg-white">Descripción</TableHead>
                                        <TableHead className="bg-white">Ticket ID</TableHead>
                                        <TableHead className="bg-white">Creado por</TableHead>
                                        <TableHead className="text-right w-[150px] bg-white">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRegularizations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                {hasActiveFilters ? "No hay regularizaciones que coincidan con los filtros." : "No hay regularizaciones registradas."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {/* Top spacer for virtualization */}
                                            {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}
                                                        colSpan={9}
                                                    />
                                                </TableRow>
                                            )}

                                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                                const reg = filteredRegularizations[virtualRow.index];
                                                return (
                                                    <RegularizationRow
                                                        key={reg.id}
                                                        reg={reg}
                                                        getTypeBadge={getTypeBadge}
                                                    />
                                                );
                                            })}

                                            {/* Bottom spacer for virtualization */}
                                            {rowVirtualizer.getVirtualItems().length > 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        style={{
                                                            height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px`
                                                        }}
                                                        colSpan={9}
                                                    />
                                                </TableRow>
                                            )}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
