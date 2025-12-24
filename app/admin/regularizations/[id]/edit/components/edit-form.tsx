"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateRegularization } from "@/app/actions/regularizations";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RegularizationEditFormProps {
    regularization: any;
    workPackages: Array<{
        id: string;
        name: string;
        contractType?: string;
        client: { name: string };
    }>;
}

export function RegularizationEditForm({ regularization, workPackages }: RegularizationEditFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        workPackageId: regularization.workPackageId,
        date: new Date(regularization.date).toISOString().split('T')[0],
        type: regularization.type,
        quantity: regularization.quantity.toString(),
        description: regularization.description || "",
        ticketId: regularization.ticketId || "",
        note: regularization.note || ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = await updateRegularization(regularization.id, {
            workPackageId: formData.workPackageId,
            date: new Date(formData.date),
            type: formData.type,
            quantity: parseFloat(formData.quantity),
            description: formData.description || undefined,
            ticketId: formData.ticketId || undefined,
            note: formData.note || undefined
        });

        if (result.success) {
            router.push('/admin/regularizations');
            router.refresh();
        } else {
            alert(result.error || "Error al actualizar regularización");
            setIsSubmitting(false);
        }
    };

    const isManualConsumption = formData.type === "MANUAL_CONSUMPTION";
    const selectedWpData = workPackages.find(wp => wp.id === formData.workPackageId);
    const isEventosWp = selectedWpData?.contractType?.toUpperCase() === 'EVENTOS';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/regularizations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Regularización</h1>
                    <p className="text-muted-foreground">Modificar ajuste de horas o consumo manual</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la Regularización</CardTitle>
                        <CardDescription>Modifique los campos necesarios</CardDescription>
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
                                        <SelectValue />
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
                                        <SelectItem value="EXCESS">Exceso</SelectItem>
                                        <SelectItem value="RETURN">Devolución</SelectItem>
                                        <SelectItem value="MANUAL_CONSUMPTION">Consumo Manual</SelectItem>
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

                        {isManualConsumption && (
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
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
