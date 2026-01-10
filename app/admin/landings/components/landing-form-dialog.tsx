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
import { LandingBuilder } from "./landing-builder";
import { LandingPageView } from "@/app/landing/[slug]/components/landing-page-view";
import { Eye } from "lucide-react";

interface LandingFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userId: string;
    editingLanding?: any;
}

export function LandingFormDialog({ isOpen, onClose, onSave, userId, editingLanding }: LandingFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
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

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Diseño de la Página (Bloques)</Label>
                        <LandingBuilder
                            value={formData.content}
                            onChange={val => setFormData(prev => ({ ...prev, content: val }))}
                        />
                        <p className="text-[10px] text-slate-400">
                            Construye tu página añadiendo bloques modulares. Cada bloque tiene su propio diseño profesional.
                        </p>
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

                <DialogFooter className="flex items-center justify-between gap-2 border-t pt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        className="text-indigo-600 font-bold gap-2"
                        onClick={() => setPreviewOpen(true)}
                        disabled={!formData.content}
                    >
                        <Eye className="w-4 h-4" />
                        Previsualizar
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!isValid || loading}>
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : "Guardar"}
                        </Button>
                    </div>
                </DialogFooter>

                {/* Preview Modal */}
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto p-0 border-none bg-slate-50">
                        <div className="sticky top-0 right-0 p-4 flex justify-end z-[60]">
                            <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(false)} className="rounded-full shadow-lg">
                                <X className="w-4 h-4 mr-2" />
                                Cerrar Vista Previa
                            </Button>
                        </div>
                        <div className="-mt-12">
                            <LandingPageView
                                landing={{
                                    content: formData.content,
                                    slug: formData.slug || "vista-previa",
                                    title: formData.title || "Tu Título",
                                    creator: { name: "Admin", surname: "" }
                                }}
                                userName="Tu Nombre"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
