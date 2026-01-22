"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSpecialRegularization, updateSpecialRegularization } from "@/app/actions/special-regularizations";
import { Plus, Trash2 } from "lucide-react";
import type { RappelTier, ConsultantLevelRate } from "@/lib/regularization-engine";

interface Props {
    initialData?: {
        id: string;
        name: string;
        type: string;
        config: string;
    };
}

export function SpecialRegularizationForm({ initialData }: Props) {
    const router = useRouter();
    const isEdit = !!initialData;

    const [name, setName] = useState(initialData?.name || "");
    const [type, setType] = useState<"RAPPEL" | "CONSULTANT_LEVEL">((initialData?.type as any) || "RAPPEL");

    const [rappelTiers, setRappelTiers] = useState<RappelTier[]>(() => {
        if (isEdit && initialData.type === "RAPPEL") {
            try {
                return JSON.parse(initialData.config);
            } catch (e) {
                console.error("Error parsing config", e);
            }
        }
        return [{ minHours: 0, maxHours: 30, rate: 60 }];
    });

    const [consultantLevels, setConsultantLevels] = useState<Array<{ level: string; rate: number }>>(() => {
        if (isEdit && initialData.type === "CONSULTANT_LEVEL") {
            try {
                const config = JSON.parse(initialData.config);
                return Object.entries(config).map(([level, rate]) => ({ level, rate: rate as number }));
            } catch (e) {
                console.error("Error parsing config", e);
            }
        }
        return [
            { level: "Junior", rate: 45 },
            { level: "Senior", rate: 60 }
        ];
    });

    const [loading, setLoading] = useState(false);

    const handleAddTier = () => {
        const lastTier = rappelTiers[rappelTiers.length - 1];
        const newMin = (lastTier.maxHours || 0) + 1;
        setRappelTiers([...rappelTiers, { minHours: newMin, maxHours: null, rate: 50 }]);
    };

    const handleRemoveTier = (index: number) => {
        setRappelTiers(rappelTiers.filter((_, i) => i !== index));
    };

    const handleTierChange = (index: number, field: keyof RappelTier, value: any) => {
        const updated = [...rappelTiers];
        updated[index] = { ...updated[index], [field]: value };
        setRappelTiers(updated);
    };

    const handleAddLevel = () => {
        setConsultantLevels([...consultantLevels, { level: "", rate: 50 }]);
    };

    const handleRemoveLevel = (index: number) => {
        setConsultantLevels(consultantLevels.filter((_, i) => i !== index));
    };

    const handleLevelChange = (index: number, field: "level" | "rate", value: any) => {
        const updated = [...consultantLevels];
        updated[index] = { ...updated[index], [field]: value };
        setConsultantLevels(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let config: RappelTier[] | ConsultantLevelRate;

        if (type === "RAPPEL") {
            config = rappelTiers;
        } else {
            config = consultantLevels.reduce((acc, item) => {
                if (item.level) acc[item.level] = item.rate;
                return acc;
            }, {} as ConsultantLevelRate);
        }

        const result = isEdit
            ? await updateSpecialRegularization(initialData.id, { name, type, config })
            : await createSpecialRegularization({ name, type, config });

        if (result.success) {
            router.push("/admin/special-regularizations");
            router.refresh();
        } else {
            alert(result.error);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la Regularización</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Rappel Refresco, Categorías Transcom"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Estrategia</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)} disabled={isEdit}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RAPPEL">Rappel por Volumen</SelectItem>
                                <SelectItem value="CONSULTANT_LEVEL">Categoría de Consultor</SelectItem>
                            </SelectContent>
                        </Select>
                        {isEdit && <p className="text-xs text-muted-foreground">El tipo no puede cambiarse una vez creada la regularización.</p>}
                    </div>
                </CardContent>
            </Card>

            {type === "RAPPEL" && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Tramos de Rappel</CardTitle>
                        <CardDescription>
                            Define las tarifas según el volumen total de horas a regularizar
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rappelTiers.map((tier, index) => (
                            <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <Label>Desde (horas)</Label>
                                    <Input
                                        type="number"
                                        value={tier.minHours}
                                        onChange={(e) => handleTierChange(index, "minHours", parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Hasta (horas)</Label>
                                    <Input
                                        type="number"
                                        value={tier.maxHours || ""}
                                        onChange={(e) => handleTierChange(index, "maxHours", e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="Infinito"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Tarifa (€/h)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tier.rate}
                                        onChange={(e) => handleTierChange(index, "rate", parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                {rappelTiers.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveTier(index)}
                                        className="text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={handleAddTier} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir Tramo
                        </Button>
                    </CardContent>
                </Card>
            )}

            {type === "CONSULTANT_LEVEL" && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Tarifas por Nivel</CardTitle>
                        <CardDescription>
                            Define las tarifas según la categoría del consultor
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {consultantLevels.map((level, index) => (
                            <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <Label>Nivel / Categoría</Label>
                                    <Input
                                        value={level.level}
                                        onChange={(e) => handleLevelChange(index, "level", e.target.value)}
                                        placeholder="Ej: Junior, Senior"
                                        required
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Tarifa (€/h)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={level.rate}
                                        onChange={(e) => handleLevelChange(index, "rate", parseFloat(e.target.value))}
                                        required
                                    />
                                </div>
                                {consultantLevels.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveLevel(index)}
                                        className="text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={handleAddLevel} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir Nivel
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end gap-4 mt-6">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : isEdit ? "Actualizar Regularización" : "Crear Regularización"}
                </Button>
            </div>
        </form>
    );
}
