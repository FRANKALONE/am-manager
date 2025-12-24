"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import { createCorrectionModel, deleteCorrectionModel, updateCorrectionModel } from "@/app/actions/correction-models";
import { useFormStatus } from "react-dom";

type Model = {
    id: number;
    name: string;
    code: string;
    description: string | null;
    config: string;
    isDefault: boolean;
};

export function CorrectionModelsManager({ models }: { models: Model[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<Model | null>(null);

    const handleEdit = (model: Model) => {
        setEditingModel(model);
        setIsOpen(true);
    };

    const handleCreate = () => {
        setEditingModel(null);
        setIsOpen(true);
    };

    return (
        <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Modelos de Corrección</CardTitle>
                    <CardDescription>Algoritmos de transformación de horas (Tempo → Facturable)</CardDescription>
                </div>
                <Button onClick={handleCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Nuevo Modelo</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Valores Default</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {models.map((model) => (
                            <TableRow key={model.id}>
                                <TableCell className="font-medium">
                                    {model.name} {model.isDefault && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Default</span>}
                                </TableCell>
                                <TableCell>{model.code}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{model.description}</TableCell>
                                <TableCell className="text-xs font-mono truncate max-w-[200px]">{model.config}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <form action={async () => { await deleteCorrectionModel(model.id); }} className="inline-block">
                                        <Button variant="ghost" size="icon" className="text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <ModelDialog
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    model={editingModel}
                />
            </CardContent>
        </Card>
    );
}

function ModelDialog({ isOpen, setIsOpen, model }: { isOpen: boolean, setIsOpen: (v: boolean) => void, model: Model | null }) {

    // Default template for new models
    const defaultTemplate = JSON.stringify({
        type: "TIERED",
        tiers: [
            { max: 0.5, type: "ADD", value: 0 },
            { max: 999, type: "ADD", value: 0 }
        ]
    }, null, 2);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{model ? "Editar Modelo" : "Crear Nuevo Modelo"}</DialogTitle>
                </DialogHeader>

                <form
                    action={async (formData) => {
                        const res = model
                            ? await updateCorrectionModel(model.id, null, formData)
                            : await createCorrectionModel(null, formData);

                        if (res.error) {
                            alert(res.error);
                        } else {
                            setIsOpen(false);
                        }
                    }}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input name="name" defaultValue={model?.name || ""} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Código (Único)</Label>
                            <Input name="code" defaultValue={model?.code || ""} readOnly={!!model} placeholder="ej: TIERED_V2" required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input name="description" defaultValue={model?.description || ""} />
                    </div>

                    <div className="space-y-2">
                        <Label>Configuración (JSON Logic)</Label>
                        <Textarea
                            name="config"
                            className="font-mono text-xs min-h-[150px]"
                            defaultValue={model?.config || defaultTemplate}
                            required
                        />
                        <p className="text-xs text-muted-foreground">Estructura válida para lógica TIERED, FIXED o RATE_DIFF.</p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input type="checkbox" name="isDefault" id="isDefault" defaultChecked={model?.isDefault} className="h-4 w-4" />
                        <Label htmlFor="isDefault">Marcar como Default</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <SubmitButton />
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>;
}
