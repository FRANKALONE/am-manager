"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { createLanding, updateLanding } from "@/app/actions/landings";

interface LandingFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userId: string;
    editingLanding?: any;
}

export function LandingFormDialog({ isOpen, onClose, onSave, userId, editingLanding }: LandingFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        slug: "",
        title: "",
        content: "",
        showInHeader: false,
        priority: 0,
        activeFrom: "",
        activeUntil: ""
    });

    const availableRoles = ["ADMIN", "GERENTE", "DIRECTOR", "COLABORADOR", "USER"];

    useEffect(() => {
        if (editingLanding) {
            setFormData({
                slug: editingLanding.slug || "",
                title: editingLanding.title || "",
                content: editingLanding.content || "",
                showInHeader: editingLanding.showInHeader || false,
                priority: editingLanding.priority || 0,
                activeFrom: editingLanding.activeFrom ? new Date(editingLanding.activeFrom).toISOString().slice(0, 16) : "",
                activeUntil: editingLanding.activeUntil ? new Date(editingLanding.activeUntil).toISOString().slice(0, 16) : ""
            });
            setSelectedRoles(editingLanding.allowedRoles?.split(',') || []);
        } else {
            setFormData({ slug: "", title: "", content: "", showInHeader: false, priority: 0, activeFrom: "", activeUntil: "" });
            setSelectedRoles([]);
        }
    }, [editingLanding, isOpen]);

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (editingLanding) {
                await updateLanding(editingLanding.id, {
                    ...formData,
                    allowedRoles: selectedRoles.join(','),
                    activeFrom: formData.activeFrom ? new Date(formData.activeFrom) : undefined,
                    activeUntil: formData.activeUntil ? new Date(formData.activeUntil) : undefined
                });
            } else {
                await createLanding({
                    ...formData,
                    allowedRoles: selectedRoles.join(','),
                    createdBy: userId,
                    activeFrom: formData.activeFrom ? new Date(formData.activeFrom) : undefined,
                    activeUntil: formData.activeUntil ? new Date(formData.activeUntil) : undefined
                });
            }
            onSave();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const isValid = formData.slug && formData.title && formData.content && selectedRoles.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingLanding ? "Editar Landing Page" : "Nueva Landing Page"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Slug (URL)</Label>
                            <Input value={formData.slug} onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))} placeholder="mi-landing" />
                            <p className="text-xs text-slate-500 mt-1">URL: /landing/{formData.slug}</p>
                        </div>
                        <div>
                            <Label>Título</Label>
                            <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Anuncio Importante" />
                        </div>
                    </div>

                    <div>
                        <Label>Contenido HTML</Label>
                        <Textarea value={formData.content} onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))} className="min-h-[200px] font-mono text-sm" placeholder="<h1>Título</h1>\n<p>Contenido...</p>" />
                    </div>

                    <div>
                        <Label className="mb-2 block">Roles Permitidos</Label>
                        <div className=" flex flex-wrap gap-2">
                            {availableRoles.map(role => (
                                <Badge key={role} variant={selectedRoles.includes(role) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleRole(role)}>
                                    {role}
                                    {selectedRoles.includes(role) && <X className="w-3 h-3 ml-1" />}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Activa Desde</Label>
                            <Input type="datetime-local" value={formData.activeFrom} onChange={e => setFormData(prev => ({ ...prev, activeFrom: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Activa Hasta (Opcional)</Label>
                            <Input type="datetime-local" value={formData.activeUntil} onChange={e => setFormData(prev => ({ ...prev, activeUntil: e.target.value }))} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.showInHeader} onCheckedChange={v => setFormData(prev => ({ ...prev, showInHeader: v }))} />
                            <Label>Mostrar en navegación</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>Prioridad</Label>
                            <Input type="number" min="0" value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))} className="w-20" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!isValid || loading}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
