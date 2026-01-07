"use client";

import { createRegularization, deleteRegularization } from "@/app/actions/regularizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "@/lib/use-translations";
import { formatDate as formatTimezoneDate } from "@/lib/date-utils";

export function RegularizationManager({ wpId, regularizations, user }: { wpId: string, regularizations: any[], user: { id: string, name: string, surname?: string } }) {
    const { t, locale } = useTranslations();
    const [isPending, startTransition] = useTransition();

    // Form State
    const [date, setDate] = useState("");
    const [type, setType] = useState("EXCESS");
    const [quantity, setQuantity] = useState("");
    const [description, setDescription] = useState("");

    function handleAdd() {
        if (!date || !quantity) return;
        startTransition(async () => {
            await createRegularization({
                workPackageId: wpId,
                date: new Date(date),
                type: type as "EXCESS" | "RETURN" | "MANUAL_CONSUMPTION" | "SOBRANTE_ANTERIOR",
                quantity: parseFloat(quantity),
                description,
                createdBy: user.id,
                createdByName: `${user.name}${user.surname ? ' ' + user.surname : ''}`
            });
            // Reset form
            setDate("");
            setQuantity("");
            setDescription("");
        });
    }

    function handleDelete(id: number) {
        if (!confirm(t('workPackages.regularization.confirmDelete'))) return;
        startTransition(async () => {
            await deleteRegularization(id);
        });
    }

    const formatDate = (dateStr: string) => {
        return formatTimezoneDate(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('workPackages.regularization.tableHeader.date')}</TableHead>
                            <TableHead>{t('workPackages.regularization.tableHeader.type')}</TableHead>
                            <TableHead>{t('workPackages.regularization.tableHeader.quantity')}</TableHead>
                            <TableHead>{t('workPackages.regularization.tableHeader.description')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {regularizations.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>{formatDate(r.date)}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.type === 'EXCESS'
                                        ? 'border-transparent bg-red-100 text-red-800'
                                        : 'border-transparent bg-green-100 text-green-800'
                                        }`}>
                                        {r.type === 'EXCESS' ? t('workPackages.regularization.types.excess') : t('workPackages.regularization.types.return')}
                                    </span>
                                </TableCell>
                                <TableCell>{r.quantity}</TableCell>
                                <TableCell>{r.description}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(r.id)} type="button">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {regularizations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">{t('workPackages.regularization.noResults')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid gap-4 items-end bg-muted/30 p-4 rounded-md md:grid-cols-5">
                <div className="space-y-2">
                    <Label>{t('workPackages.regularization.date')}</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>{t('workPackages.regularization.type')}</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option value="EXCESS">{t('workPackages.regularization.types.excess')}</option>
                        <option value="RETURN">{t('workPackages.regularization.types.return')}</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>{t('workPackages.regularization.quantity')}</Label>
                    <Input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-1">
                    <Label>{t('workPackages.regularization.description')}</Label>
                    <Input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('workPackages.regularization.descriptionPlaceholder')} />
                </div>
                <Button
                    variant="secondary"
                    onClick={handleAdd}
                    disabled={isPending || !date || !quantity}
                    type="button"
                >
                    {t('workPackages.regularization.addButton')}
                </Button>
            </div>
        </div>
    );
}
