"use client";

import { useState, useMemo } from "react";
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

interface RegularizationsListProps {
    regularizations: any[];
}

export function RegularizationsList({ regularizations }: RegularizationsListProps) {
    const [filters, setFilters] = useState({
        month: "all",
        year: "all",
        client: "all",
        workPackage: "all",
        type: "all",
        ticketId: ""
    });

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "EXCESS":
                return <Badge variant="destructive">Exceso</Badge>;
            case "RETURN":
                return <Badge className="bg-green-600 hover:bg-green-700">Devolución</Badge>;
            case "SOBRANTE_ANTERIOR":
                return <Badge className="bg-blue-600 hover:bg-blue-700">Sobrante Anterior</Badge>;
            case "MANUAL_CONSUMPTION":
                return <Badge className="bg-blue-600 hover:bg-blue-700">Consumo Manual</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    // Extract unique values for filters
    const uniqueClients = useMemo(() => {
        const clients = new Set(regularizations.map(r => r.workPackage.client.name));
        return Array.from(clients).sort();
    }, [regularizations]);

    const uniqueWorkPackages = useMemo(() => {
        const wps = new Set(regularizations.map(r => r.workPackage.name));
        return Array.from(wps).sort();
    }, [regularizations]);

    const uniqueMonths = useMemo(() => {
        const months = new Set(regularizations.map(r => {
            const date = new Date(r.date);
            return String(date.getMonth() + 1).padStart(2, '0');
        }));
        return Array.from(months).sort();
    }, [regularizations]);

    const uniqueYears = useMemo(() => {
        const years = new Set(regularizations.map(r => new Date(r.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [regularizations]);

    // Filter regularizations
    const filteredRegularizations = useMemo(() => {
        return regularizations.filter(reg => {
            const date = new Date(reg.date);
            const regMonth = String(date.getMonth() + 1).padStart(2, '0');
            const regYear = String(date.getFullYear());

            if (filters.month !== "all" && regMonth !== filters.month) return false;
            if (filters.year !== "all" && regYear !== filters.year) return false;
            if (filters.client !== "all" && reg.workPackage.client.name !== filters.client) return false;
            if (filters.workPackage !== "all" && reg.workPackage.name !== filters.workPackage) return false;
            if (filters.type !== "all" && reg.type !== filters.type) return false;
            if (filters.ticketId && !reg.ticketId?.toLowerCase().includes(filters.ticketId.toLowerCase())) return false;

            return true;
        });
    }, [regularizations, filters]);

    const clearFilters = () => {
        setFilters({
            month: "all",
            year: "all",
            client: "all",
            workPackage: "all",
            type: "all",
            ticketId: ""
        });
    };

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === "ticketId") return value !== "";
        return value !== "all";
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
                            <Select value={filters.month} onValueChange={(v) => setFilters({ ...filters, month: v })}>
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
                            <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
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
                            <Select value={filters.client} onValueChange={(v) => setFilters({ ...filters, client: v })}>
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
                            <Select value={filters.workPackage} onValueChange={(v) => setFilters({ ...filters, workPackage: v })}>
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
                            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="EXCESS">Exceso</SelectItem>
                                    <SelectItem value="RETURN">Devolución</SelectItem>
                                    <SelectItem value="SOBRANTE_ANTERIOR">Sobrante Anterior</SelectItem>
                                    <SelectItem value="MANUAL_CONSUMPTION">Consumo Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ticket ID</label>
                            <Input
                                placeholder="Buscar..."
                                value={filters.ticketId}
                                onChange={(e) => setFilters({ ...filters, ticketId: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado Global</CardTitle>
                    <CardDescription>
                        Mostrando {filteredRegularizations.length} de {regularizations.length} registros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Work Package</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Ticket ID</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegularizations.map((reg: any) => (
                                    <TableRow key={reg.id}>
                                        <TableCell>
                                            {new Date(reg.date).toLocaleDateString("es-ES", {
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
                                        <TableCell className="text-right font-bold">
                                            {reg.quantity} h
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate" title={reg.description || ""}>
                                            {reg.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {reg.ticketId || "-"}
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
                                ))}
                                {filteredRegularizations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            {hasActiveFilters ? "No hay regularizaciones que coincidan con los filtros." : "No hay regularizaciones registradas."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
