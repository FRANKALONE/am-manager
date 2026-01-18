"use client";

import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, ArrowUpDown, TrendingUp, TrendingDown, Minus, ExternalLink, Settings, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface WpData {
    id: string;
    name: string;
    clientName: string;
    contractType: string;
    startDate: string;
    endDate: string;
    totalScope: number;
    totalConsumed: number;
    remaining: number;
    scopeUnit: string;
    isEventos: boolean;
    contractedToDate: number;
    clientId: string;
}

export function WpAccumulatedConsumptionView({ initialData }: { initialData: WpData[] }) {
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof WpData; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: keyof WpData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = useMemo(() => {
        let data = initialData.filter(wp =>
            wp.name.toLowerCase().includes(search.toLowerCase()) ||
            wp.clientName.toLowerCase().includes(search.toLowerCase()) ||
            wp.contractType?.toLowerCase().includes(search.toLowerCase())
        );

        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [initialData, search, sortConfig]);

    const stats = useMemo(() => {
        return {
            totalWps: initialData.length,
            negativeBalance: initialData.filter(d => d.remaining < -1).length,
            healthyBalance: initialData.filter(d => d.remaining >= 0).length,
        };
    }, [initialData]);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num);
    };

    const getRemainingColor = (remaining: number) => {
        if (remaining < -1) return "text-red-600 dark:text-red-400 font-bold";
        if (remaining < 5 && remaining >= -1) return "text-amber-600 dark:text-amber-400 transition-colors";
        return "text-emerald-600 dark:text-emerald-400 transition-colors";
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Work Packages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalWps}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Saldos Positivos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.healthyBalance}</div>
                        <TrendingUp className="text-emerald-500" size={20} />
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Excesos Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.negativeBalance}</div>
                        <TrendingDown className="text-red-500" size={20} />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center space-x-4 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                placeholder="Buscar por WP, cliente o tipo..."
                                className="pl-10 bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50/50">
                                    <TableHead className="w-[300px] cursor-pointer" onClick={() => handleSort('name')}>
                                        <div className="flex items-center space-x-1">
                                            <span>Work Package</span>
                                            <ArrowUpDown size={14} className="text-slate-400" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('clientName')}>
                                        <div className="flex items-center space-x-1">
                                            <span>Cliente</span>
                                            <ArrowUpDown size={14} className="text-slate-400" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-center font-semibold text-slate-900 dark:text-slate-300">Total Periodo</TableHead>
                                    <TableHead className="text-center font-semibold text-slate-900 dark:text-slate-300">Consumido</TableHead>
                                    <TableHead className="text-center font-semibold text-slate-900 dark:text-slate-300" onClick={() => handleSort('remaining')}>
                                        <div className="flex items-center justify-center space-x-1 cursor-pointer">
                                            <span>Saldo Actual</span>
                                            <ArrowUpDown size={14} className="text-slate-400" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Unidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length > 0 ? (
                                    filteredData.map((wp) => (
                                        <TableRow key={wp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                                            <TableCell className="font-medium">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity group">
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-slate-900 dark:text-white">{wp.name}</span>
                                                                <MoreVertical size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span className="text-xs text-slate-400 font-normal">{wp.contractType}</span>
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-56">
                                                        <DropdownMenuLabel>Acciones - {wp.name}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard?clientId=${wp.clientId}&wpId=${wp.id}`} className="flex items-center cursor-pointer">
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                <span>Ver Dashboard de Consumos</span>
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/work-packages/${wp.id}`} className="flex items-center cursor-pointer">
                                                                <Settings className="mr-2 h-4 w-4" />
                                                                <span>Editar Work Package</span>
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{wp.clientName}</TableCell>
                                            <TableCell className="text-center text-slate-600 dark:text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <span>{formatNumber(wp.totalScope)}</span>
                                                    {wp.isEventos && (
                                                        <span className="text-[10px] text-slate-400 font-normal">Total Periodo</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-slate-900 dark:text-white font-medium">
                                                        {wp.isEventos ? (
                                                            `${formatNumber(wp.totalConsumed)} / ${formatNumber(wp.contractedToDate || 0)}`
                                                        ) : (
                                                            formatNumber(wp.totalConsumed)
                                                        )}
                                                    </span>
                                                    <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 mt-1 rounded-full overflow-hidden flex">
                                                        <div
                                                            className={`h-full ${wp.totalConsumed > (wp.isEventos ? (wp.contractedToDate || 0) : wp.totalScope) ? 'bg-red-500' : 'bg-blue-500'}`}
                                                            style={{ flexBasis: `${Math.min(100, (wp.totalConsumed / ((wp.isEventos ? (wp.contractedToDate || wp.totalScope) : wp.totalScope) || 1)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`text-lg transition-colors ${getRemainingColor(wp.remaining)}`}>
                                                    {wp.remaining > 0 ? '+' : ''}{formatNumber(wp.remaining)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-normal text-slate-400 border-slate-200">
                                                    {wp.scopeUnit}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                            No se encontraron Work Packages.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
