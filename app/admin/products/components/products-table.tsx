"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";
import { ProductDialog } from "./product-dialog";

interface ProductsTableProps {
    products: any[];
    clients: any[];
    deleteAction: (id: string) => Promise<any>;
}

export function ProductsTable({ products, clients, deleteAction }: ProductsTableProps) {
    const { t } = useTranslations();
    const [searchTerm, setSearchTerm] = useState("");
    const [productFilter, setProductFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = searchTerm === "" ||
                p.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.notes?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesProduct = productFilter === "all" || p.productType === productFilter;
            const matchesClient = clientFilter === "all" || p.clientId === clientFilter;

            return matchesSearch && matchesProduct && matchesClient;
        });
    }, [products, searchTerm, productFilter, clientFilter]);

    const hasActiveFilters = searchTerm !== "" || productFilter !== "all" || clientFilter !== "all";

    const clearFilters = () => {
        setSearchTerm("");
        setProductFilter("all");
        setClientFilter("all");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-1.5 block text-slate-500">{t('common.search')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por cliente o notas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="w-48">
                    <label className="text-sm font-medium mb-1.5 block text-slate-500" htmlFor="product-filter">{t('altimProducts.form.productType')}</label>
                    <select
                        id="product-filter"
                        title={t('altimProducts.form.productType')}
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="all">Todos los productos</option>
                        <option value="SII">SII</option>
                        <option value="DIS">DIS</option>
                        <option value="TICKET_BAI">Ticket BAI</option>
                        <option value="EPNR">EPNR</option>
                        <option value="PORTALK">PORTALK</option>
                    </select>
                </div>

                <div className="w-64">
                    <label className="text-sm font-medium mb-1.5 block text-slate-500" htmlFor="client-filter">{t('altimProducts.form.client')}</label>
                    <select
                        id="client-filter"
                        title={t('altimProducts.form.client')}
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="all">Todos los clientes</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="text-slate-500 hover:text-red-500 px-2 h-10">
                        <X className="w-4 h-4 mr-2" />
                        Limpiar
                    </Button>
                )}
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                            <TableHead className="font-bold">{t('altimProducts.table.client')}</TableHead>
                            <TableHead className="font-bold">{t('altimProducts.table.product')}</TableHead>
                            <TableHead className="font-bold">{t('altimProducts.table.status')}</TableHead>
                            <TableHead className="font-bold">{t('altimProducts.table.startDate')}</TableHead>
                            <TableHead className="font-bold">{t('altimProducts.table.endDate')}</TableHead>
                            <TableHead className="text-right font-bold">{t('altimProducts.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.client.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        {p.productType}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={p.status === 'ACTIVE' ? 'outline' : 'secondary'}
                                        className={p.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                    >
                                        {p.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    {formatDate(p.startDate)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                    {p.endDate ? formatDate(p.endDate) : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <ProductDialog
                                            product={p}
                                            clients={clients}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            onClick={() => {
                                                if (confirm("¿Estás seguro de que quieres eliminar este contrato de producto?")) {
                                                    deleteAction(p.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredProducts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">
                                    No se encontraron productos registrados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
