"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRegularization } from "@/app/actions/regularizations";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RegularizationFormProps {
    workPackages: Array<{
        id: string;
        name: string;
        contractType?: string;
        includedTicketTypes?: string;
        client: { name: string };
    }>;
    user: {
        id: string;
        name: string;
        surname?: string;
    };
}

export function RegularizationForm({ workPackages, user }: RegularizationFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        workPackageId: "",
        date: new Date().toISOString().split('T')[0],
        type: "EXCESS",
        quantity: "",
        description: "",
        ticketId: "",
        ticketType: "",
        note: "",
        isRevenueRecognized: false,
        isBilled: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = await createRegularization({
            workPackageId: formData.workPackageId,
            date: new Date(formData.date),
            type: formData.type as any,
            quantity: parseFloat(formData.quantity),
            description: formData.description || undefined,
            ticketId: formData.ticketId || undefined,
            ticketType: formData.ticketType || undefined,
            note: formData.note || undefined,
            isRevenueRecognized: formData.isRevenueRecognized,
            isBilled: formData.isBilled,
            createdBy: user.id,
            createdByName: `${user.name}${user.surname ? ' ' + user.surname : ''}`
        });

        if (result.success) {
            router.push('/admin/regularizations');
            router.refresh();
        } else {
            alert(result.error || "Error al crear regularización");
            setIsSubmitting(false);
        }
    };

    const isManualConsumption = formData.type === "MANUAL_CONSUMPTION";
    const isReturn = formData.type === "RETURN";
    const selectedWpData = workPackages.find(wp => wp.id === formData.workPackageId);
    const isEventosWp = selectedWpData?.contractType?.toUpperCase() === 'EVENTOS';

    // Get available ticket types from selected WP
    const availableTicketTypes = selectedWpData?.includedTicketTypes
        ? selectedWpData.includedTicketTypes.split(',').map(t => t.trim()).filter(Boolean)
        : ['Evolutivo', 'Correctivo', 'Consulta'];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/regularizations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nueva Regularización</h1>
                    <p className="text-muted-foreground">Crear un nuevo ajuste de horas o consumo manual</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la Regularización</CardTitle>
                        <CardDescription>Complete los campos requeridos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="workPackageId">Work Package *</Label>
                                <Select
                                    value={formData.workPackageId}
                                    onValueChange={(value) => setFormData({ ...formData, workPackageId: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar WP" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workPackages.map((wp) => (
                                            <SelectItem key={wp.id} value={wp.id}>
                                                {wp.client.name} - {wp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date">Fecha *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXCESS">Exceso Consumo</SelectItem>
                                        <SelectItem value="RETURN">Devolución/Anulación</SelectItem>
                                        <SelectItem value="SOBRANTE_ANTERIOR">Sobrante Periodo Anterior</SelectItem>
                                        <SelectItem value="MANUAL_CONSUMPTION">Consumo Manual</SelectItem>
                                        <SelectItem value="CONTRATACION_PUNTUAL">Contratación Puntual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="quantity">
                                    Cantidad ({isEventosWp ? 'Tickets' : 'horas'}) *
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {formData.type === "EXCESS" && (
                            <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="isRevenueRecognized" className="flex flex-col gap-1">
                                        <span>Reconocimiento del ingreso</span>
                                        <span className="font-normal text-xs text-muted-foreground">Marcar si el ingreso se reconoce aunque no se haya facturado aún.</span>
                                    </Label>
                                    <input
                                        id="isRevenueRecognized"
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={formData.isRevenueRecognized}
                                        onChange={(e) => setFormData({ ...formData, isRevenueRecognized: e.target.checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="isBilled" className="flex flex-col gap-1">
                                        <span>Facturado</span>
                                        <span className="font-normal text-xs text-muted-foreground">¿Se ha emitido ya la factura de este exceso?</span>
                                    </Label>
                                    <input
                                        id="isBilled"
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={formData.isBilled}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setFormData({
                                                ...formData,
                                                isBilled: val,
                                                // If it's billed, it's usually recognized. If not billed but manually created, user might want to recognize it.
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {isReturn && (
                            <div className="space-y-2">
                                <Label htmlFor="ticketId">Ticket ID (opcional)</Label>
                                <Input
                                    id="ticketId"
                                    placeholder="EUR-1234"
                                    value={formData.ticketId}
                                    onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    ID del ticket del cual se devuelven las horas
                                </p>
                            </div>
                        )}

                        {isManualConsumption && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="ticketId">Ticket ID *</Label>
                                    <Input
                                        id="ticketId"
                                        placeholder="EUR-1234"
                                        value={formData.ticketId}
                                        onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                                        required={isManualConsumption}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ticketType">Tipo de Ticket *</Label>
                                    <Select
                                        value={formData.ticketType}
                                        onValueChange={(value) => setFormData({ ...formData, ticketType: value })}
                                        required={isManualConsumption}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTicketTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Categoría bajo la cual aparecerá este consumo en el dashboard
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                placeholder="Descripción breve..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                            />
                        </div>

                        {isManualConsumption && (
                            <div className="space-y-2">
                                <Label htmlFor="note">Nota Explicativa</Label>
                                <Textarea
                                    id="note"
                                    placeholder="Explicación detallada del consumo manual..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Crear Regularización"}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/admin/regularizations">Cancelar</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
