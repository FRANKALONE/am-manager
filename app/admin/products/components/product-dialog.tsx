"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/use-translations";
import { createClientProduct, updateClientProduct } from "@/app/actions/products";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";

interface ProductDialogProps {
    product?: any;
    clients: any[];
    trigger: React.ReactNode;
}

export function ProductDialog({ product, clients, trigger }: ProductDialogProps) {
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);

    const action = product
        ? updateClientProduct.bind(null, product.id)
        : createClientProduct;

    const [state, formAction] = useFormState(action, null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={async (formData) => {
                    const result = await formAction(formData) as any;
                    if (!result?.error) {
                        setOpen(false);
                    }
                }}>
                    <DialogHeader>
                        <DialogTitle>
                            {product ? t('altimProducts.form.editTitle') : t('altimProducts.form.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('altimProducts.subtitle')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {!product && (
                            <div className="grid gap-2">
                                <Label htmlFor="clientId">{t('altimProducts.form.client')}</Label>
                                <select
                                    id="clientId"
                                    name="clientId"
                                    title={t('altimProducts.form.client')}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">{t('altimProducts.form.placeholderClient')}</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="productType">{t('altimProducts.form.productType')}</Label>
                            <select
                                id="productType"
                                name="productType"
                                title={t('altimProducts.form.productType')}
                                defaultValue={product?.productType}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">{t('altimProducts.form.placeholderProduct')}</option>
                                <option value="SII">SII</option>
                                <option value="DIS">DIS</option>
                                <option value="TICKET_BAI">Ticket BAI</option>
                                <option value="EPNR">EPNR</option>
                                <option value="PORTALK">PORTALK</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">{t('altimProducts.form.startDate')}</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={product?.startDate ? new Date(product.startDate).toISOString().split('T')[0] : ''}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">{t('altimProducts.form.endDate')}</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={product?.endDate ? new Date(product.endDate).toISOString().split('T')[0] : ''}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">{t('altimProducts.form.status')}</Label>
                            <select
                                id="status"
                                name="status"
                                title={t('altimProducts.form.status')}
                                defaultValue={product?.status || 'ACTIVE'}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ACTIVE text-green-600">ACTIVE</option>
                                <option value="INACTIVE text-red-600">INACTIVE</option>
                                <option value="PENDING text-amber-600">PENDING</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">{t('altimProducts.form.notes')}</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                placeholder="Notas adicionales..."
                                defaultValue={product?.notes}
                                rows={3}
                            />
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-sm font-medium text-destructive mb-4">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <SubmitButton>{product ? t('common.save') : t('common.add')}</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
