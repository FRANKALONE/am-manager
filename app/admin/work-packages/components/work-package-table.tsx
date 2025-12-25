"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, CalendarClock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { deleteWorkPackage } from "@/app/actions/work-packages";
import { deleteWorkPackagesBulk } from "@/app/actions/bulk-actions";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkPackage {
    id: string;
    name: string;
    clientId: string;
    clientName: string;
    contractType: string;
    billingType: string;
    renewalType: string;
    _count: {
        validityPeriods: number;
    };
}

interface Props {
    wps: WorkPackage[];
    contractTypeMap: Record<string, string>;
    renewalTypeMap: Record<string, string>;
}

export function WorkPackagesTable({ wps, contractTypeMap, renewalTypeMap }: Props) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSelectAll = () => {
        if (selectedIds.length === wps.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(wps.map(wp => wp.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteBulk = async () => {
        setIsDeleting(true);
        const result = await deleteWorkPackagesBulk(selectedIds);
        setIsDeleting(false);

        if (result.success) {
            toast.success(`Eliminados ${result.count} Work Packages correctamente`);
            setSelectedIds([]);
        } else {
            toast.error(result.error || "Error al eliminar");
        }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este Work Package?")) return;
        const result = await deleteWorkPackage(id);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Work Package eliminado");
        }
    };

    return (
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        {selectedIds.length} Work Packages seleccionados
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Selección
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar eliminación masiva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Estás a punto de eliminar {selectedIds.length} Work Packages de forma permanente.
                                    Esta acción no se puede deshacer y eliminará todos los consumos y periodos asociados.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteBulk} className="bg-red-600 hover:bg-red-700">
                                    Eliminar Definitivamente
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            <div className="shadow-sm border rounded-md overflow-hidden dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="relative w-full overflow-x-auto">
                    <Table className="min-w-[1400px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] sticky left-0 z-40 bg-slate-50 dark:bg-slate-900 border-r">
                                    <Checkbox
                                        checked={selectedIds.length === wps.length && wps.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="sticky left-[50px] z-30 bg-white dark:bg-gray-900 w-[150px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">ID WP</TableHead>
                                <TableHead className="sticky left-[200px] z-30 bg-white dark:bg-gray-900 w-[250px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nombre</TableHead>
                                <TableHead className="min-w-[200px]">Cliente</TableHead>
                                <TableHead className="min-w-[150px]">Tipo Contrato</TableHead>
                                <TableHead className="min-w-[120px]">Facturación</TableHead>
                                <TableHead className="min-w-[150px]">Renovación</TableHead>
                                <TableHead className="min-w-[100px] text-center">Periodos</TableHead>
                                <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {wps.map((wp) => (
                                <TableRow key={wp.id} className={`${selectedIds.includes(wp.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900'} hover:bg-muted/50 transition-colors`}>
                                    <TableCell className="sticky left-0 z-20 bg-inherit border-r">
                                        <Checkbox
                                            checked={selectedIds.includes(wp.id)}
                                            onCheckedChange={() => toggleSelect(wp.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium sticky left-[50px] z-20 bg-inherit border-r">
                                        {wp.id}
                                    </TableCell>
                                    <TableCell className="sticky left-[200px] z-20 bg-inherit border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {wp.name}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{wp.clientName}</span>
                                    </TableCell>
                                    <TableCell>
                                        {contractTypeMap[wp.contractType] || wp.contractType}
                                    </TableCell>
                                    <TableCell>{wp.billingType}</TableCell>
                                    <TableCell>{wp.renewalType ? (renewalTypeMap[wp.renewalType] || wp.renewalType) : "-"}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700 gap-1 text-xs">
                                            <CalendarClock className="w-3 h-3" />
                                            {wp._count.validityPeriods}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/work-packages/${wp.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => handleDeleteSingle(wp.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {wps.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                                        No hay Work Packages que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
