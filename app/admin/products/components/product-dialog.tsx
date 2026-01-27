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
    const [selectedProductType, setSelectedProductType] = useState(product?.productType || "");

    const action = product
        ? updateClientProduct.bind(null, product.id)
        : createClientProduct;

    const [state, formAction] = useFormState(action, null);

    const customData = product?.customAttributes ? JSON.parse(product.customAttributes) : {};

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

                    <div className="grid gap-4 py-4 overflow-y-auto max-h-[70vh]">
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
                                onChange={(e) => setSelectedProductType(e.target.value)}
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

                        {selectedProductType === "SII" && (
                            <div className="grid gap-4 p-4 bg-muted/50 rounded-lg border">
                                <h4 className="text-sm font-semibold">{t('altimProducts.types.SII')} - {t('altimProducts.parameters')}</h4>

                                <div className="grid gap-2">
                                    <Label htmlFor="custom_middleware">{t('altimProducts.sii.middleware')}</Label>
                                    <select
                                        id="custom_middleware"
                                        name="custom_middleware"
                                        title={t('altimProducts.sii.middleware')}
                                        defaultValue={customData.middleware}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="PI_ALTIM">{t('altimProducts.sii.middlewareOptions.PI_ALTIM')}</option>
                                        <option value="PROPIO">{t('altimProducts.sii.middlewareOptions.PROPIO')}</option>
                                        <option value="HCI_SAP">{t('altimProducts.sii.middlewareOptions.HCI_SAP')}</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="custom_amount">{t('altimProducts.sii.amount')}</Label>
                                        <Input
                                            id="custom_amount"
                                            name="custom_amount"
                                            type="number"
                                            step="0.01"
                                            defaultValue={customData.amount}
                                            placeholder="0.00 €"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="custom_societies">{t('altimProducts.sii.societies')}</Label>
                                        <Input
                                            id="custom_societies"
                                            name="custom_societies"
                                            type="number"
                                            defaultValue={customData.societies}
                                            placeholder="1"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="custom_billingType">{t('altimProducts.sii.billingType')}</Label>
                                    <select
                                        id="custom_billingType"
                                        name="custom_billingType"
                                        title={t('altimProducts.sii.billingType')}
                                        defaultValue={customData.billingType}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="MONTHLY">{t('altimProducts.sii.billingTypeOptions.MONTHLY')}</option>
                                        <option value="ANNUAL">{t('altimProducts.sii.billingTypeOptions.ANNUAL')}</option>
                                    </select>
                                </div>
                            </div>
                        )}

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
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                                <option value="PENDING">PENDING</option>
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
