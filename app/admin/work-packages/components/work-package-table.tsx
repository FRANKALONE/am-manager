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
import { useTranslations } from "@/lib/use-translations";

interface WorkPackage {
    id: string;
    name: string;
    clientId: string;
    clientName: string;
    contractType: string;
    renewalType: string;
    validityPeriods: any[];
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
    const { t } = useTranslations();
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
            toast.success(t('workPackages.table.toast.deletedBulk', { count: result.count }));
            setSelectedIds([]);
        } else {
            toast.error(result.error || t('workPackages.table.toast.error'));
        }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!confirm(t('workPackages.table.confirmSingle'))) return;
        const result = await deleteWorkPackage(id);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success(t('workPackages.table.toast.deletedSingle'));
        }
    };

    return (
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        {t('workPackages.table.selected', { count: selectedIds.length })}
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('workPackages.table.deleteSelection')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('workPackages.table.confirmBulkTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('workPackages.table.confirmBulkDesc', { count: selectedIds.length })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('workPackages.filter.clear') === 'Limpiar' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteBulk} className="bg-red-600 hover:bg-red-700">
                                    {t('workPackages.table.confirmBulkAction')}
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
                                <TableHead className="sticky left-[50px] z-30 bg-white dark:bg-gray-900 w-[150px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{t('workPackages.table.id')}</TableHead>
                                <TableHead className="sticky left-[200px] z-30 bg-white dark:bg-gray-900 w-[250px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{t('workPackages.table.name')}</TableHead>
                                <TableHead className="min-w-[200px]">{t('workPackages.table.client')}</TableHead>
                                <TableHead className="min-w-[150px]">{t('workPackages.table.contract')}</TableHead>
                                <TableHead className="min-w-[120px]">{t('workPackages.table.billing')}</TableHead>
                                <TableHead className="min-w-[150px]">{t('workPackages.table.renewal')}</TableHead>
                                <TableHead className="min-w-[100px] text-center">{t('workPackages.table.periods')}</TableHead>
                                <TableHead className="text-right min-w-[100px]">{t('workPackages.table.actions')}</TableHead>
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
                                    <TableCell>
                                        {wp.validityPeriods?.[0]?.billingType || (
                                            <span className="text-slate-400 italic text-xs">No definido</span>
                                        )}
                                    </TableCell>
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
                                        {t('workPackages.table.noResults')}
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
