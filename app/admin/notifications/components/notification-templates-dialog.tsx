"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Mail, AppWindow, Code } from "lucide-react";

interface TemplateData {
    id: string;
    title: string;
    appMessage: string;
    emailSubject: string;
    emailMessage: string;
    type: string;
}

interface NotificationTemplatesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<TemplateData>) => Promise<void>;
    template: TemplateData | null;
}

export function NotificationTemplatesDialog({ isOpen, onClose, onSave, template }: NotificationTemplatesDialogProps) {
    const [formData, setFormData] = useState<Partial<TemplateData>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (template) {
            setFormData({
                appMessage: template.appMessage || "",
                emailSubject: template.emailSubject || "",
                emailMessage: template.emailMessage || ""
            });
        }
    }, [template]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const placeholders: Record<string, string[]> = {
        DEFAULT: ["{name}", "{clientName}", "{wpName}"],
        CONTRACT_RENEWED: ["{endDate}", "{ipcValue}", "{newRate}", "{quantity}", "{unit}", "{startDate}"],
        LOW_BALANCE: ["{balance}", "{unit}"],
        JIRA_USER_REQUEST_CREATED: ["{type}"]
    };

    const currentPlaceholders = [
        ...placeholders.DEFAULT,
        ...(placeholders[template?.type || ""] || [])
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-indigo-500" />
                        Editar Plantillas: {template?.title}
                    </DialogTitle>
                    <DialogDescription>
                        Personaliza los mensajes que verán los usuarios. Usa llaves para datos dinámicos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Tabs defaultValue="app" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                            <TabsTrigger value="app" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <AppWindow className="w-4 h-4" /> App
                            </TabsTrigger>
                            <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Mail className="w-4 h-4" /> Email
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="app" className="space-y-4 pt-4 border-none shadow-none">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Mensaje en la App</Label>
                                <Textarea
                                    value={formData.appMessage}
                                    onChange={e => setFormData(prev => ({ ...prev, appMessage: e.target.value }))}
                                    placeholder="Ej: El contrato {wpName} ha sido renovado..."
                                    className="min-h-[100px] bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-slate-400">Este mensaje aparecerá en el panel de notificaciones del usuario.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="email" className="space-y-4 pt-4 border-none shadow-none">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Asunto del Email</Label>
                                <Input
                                    value={formData.emailSubject}
                                    onChange={e => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                                    placeholder="Ej: ✅ Renovación: {clientName}"
                                    className="bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Cuerpo del Email</Label>
                                <Textarea
                                    value={formData.emailMessage}
                                    onChange={e => setFormData(prev => ({ ...prev, emailMessage: e.target.value }))}
                                    placeholder="Hola {name}, te informamos que..."
                                    className="min-h-[150px] bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-slate-400">El sistema añadirá automáticamente el saludo "Hola [Nombre]" y un pie de página estándar.</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Info className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Variables disponibles</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {currentPlaceholders.map(p => (
                                <code key={p} className="px-1.5 py-0.5 bg-white border border-indigo-100 rounded text-[11px] font-mono text-indigo-700 shadow-sm">
                                    {p}
                                </code>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="border-slate-200 hover:bg-slate-50">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-malachite hover:bg-malachite/90 text-white shadow-lg shadow-malachite/20">
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
