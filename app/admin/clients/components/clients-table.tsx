"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Pencil, Trash2, Search, X } from "lucide-react";

interface ClientsTableProps {
    clients: any[]; // Using any to accept Prisma client type
    managerMap: Record<string, string>;
    deleteClientAction: (id: string) => Promise<void>;
}

export function ClientsTable({ clients, managerMap, deleteClientAction }: ClientsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [managerFilter, setManagerFilter] = useState<string>("all");

    // Get unique managers from clients
    const uniqueManagers = useMemo(() => {
        const managers = new Set<string>();
        clients.forEach(client => {
            if (client.manager) {
                managers.add(client.manager);
            }
        });
        return Array.from(managers);
    }, [clients]);

    // Filter clients
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            // Filter by search term (ID or Name)
            const matchesSearch = searchTerm === "" ||
                client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.name.toLowerCase().includes(searchTerm.toLowerCase());

            // Filter by manager
            const matchesManager = managerFilter === "all" ||
                (managerFilter === "unassigned" && !client.manager) ||
                client.manager === managerFilter;

            return matchesSearch && matchesManager;
        });
    }, [clients, searchTerm, managerFilter]);

    const clearFilters = () => {
        setSearchTerm("");
        setManagerFilter("all");
    };

    const hasActiveFilters = searchTerm !== "" || managerFilter !== "all";

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Buscar por ID o Nombre</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="w-64">
                    <label className="text-sm font-medium mb-2 block">Filtrar por Gerente</label>
                    <select
                        value={managerFilter}
                        onChange={(e) => setManagerFilter(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="all">Todos los gerentes</option>
                        <option value="unassigned">Sin asignar</option>
                        {uniqueManagers.map(manager => (
                            <option key={manager} value={manager}>
                                {managerMap[manager] || manager}
                            </option>
                        ))}
                    </select>
                </div>

                {hasActiveFilters && (
                    <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="gap-2"
                    >
                        <X className="w-4 h-4" />
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Results count */}
            {hasActiveFilters && (
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredClients.length} de {clients.length} clientes
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border bg-white dark:bg-gray-900 shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Cliente</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Gerente</TableHead>
                            <TableHead>Portal Cliente</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.id}</TableCell>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>
                                    {client.manager ? (
                                        <Badge variant="secondary" className="font-normal">
                                            {managerMap[client.manager] || client.manager}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground italic text-xs">Sin asignar</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {client.clientPortalUrl ? (
                                        <a
                                            href={client.clientPortalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                                        >
                                            Ver Portal
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground italic text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/admin/clients/${client.id}/edit`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <form action={deleteClientAction.bind(null, client.id)}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredClients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    {hasActiveFilters
                                        ? "No se encontraron clientes con los filtros aplicados."
                                        : "No hay clientes registrados."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
