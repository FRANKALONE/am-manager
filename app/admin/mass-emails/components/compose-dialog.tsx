"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Send, Loader2 } from "lucide-react";
import { createMassEmail, updateMassEmail, getEligibleRecipients } from "@/app/actions/mass-emails";
import { RecipientsFilter } from "./recipients-filter";

interface ComposeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userId: string;
    editingEmail?: any;
}

export function ComposeDialog({ isOpen, onClose, onSave, userId, editingEmail }: ComposeDialogProps) {
    const [activeTab, setActiveTab] = useState("recipients");
    const [loading, setLoading] = useState(false);
    const [previewRecipients, setPreviewRecipients] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        subject: "",
        htmlBody: "",
        targetRoles: "",
        targetClients: "",
        targetWpTypes: ""
    });

    useEffect(() => {
        if (editingEmail) {
            setFormData({
                subject: editingEmail.subject || "",
                htmlBody: editingEmail.htmlBody || "",
                targetRoles: editingEmail.targetRoles || "",
                targetClients: editingEmail.targetClients || "",
                targetWpTypes: editingEmail.targetWpTypes || ""
            });
        } else {
            setFormData({
                subject: "",
                htmlBody: "",
                targetRoles: "",
                targetClients: "",
                targetWpTypes: ""
            });
        }
        setActiveTab("recipients");
    }, [editingEmail, isOpen]);

    const handleFiltersChange = async (filters: {
        targetRoles: string;
        targetClients: string;
        targetWpTypes: string;
    }) => {
        setFormData(prev => ({ ...prev, ...filters }));

        // Fetch preview
        const recipients = await getEligibleRecipients(filters);
        setPreviewRecipients(recipients);
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            if (editingEmail) {
                const result = await updateMassEmail(editingEmail.id, formData);
                if (result.success) {
                    onSave();
                    onClose();
                }
            } else {
                const result = await createMassEmail({
                    ...formData,
                    createdBy: userId
                });
                if (result.success) {
                    onSave();
                    onClose();
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = formData.subject.trim() && formData.htmlBody.trim() &&
        (formData.targetRoles || formData.targetClients || formData.targetWpTypes);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        {editingEmail ? "Editar Email Masivo" : "Nuevo Email Masivo"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="recipients">
                            <Users className="w-4 h-4 mr-2" />
                            1. Destinatarios
                        </TabsTrigger>
                        <TabsTrigger value="content">
                            <FileText className="w-4 h-4 mr-2" />
                            2. Contenido
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="recipients" className="space-y-4 mt-4">
                        <RecipientsFilter
                            initialFilters={{
                                targetRoles: formData.targetRoles,
                                targetClients: formData.targetClients,
                                targetWpTypes: formData.targetWpTypes
                            }}
                            onChange={handleFiltersChange}
                        />

                        {previewRecipients.length > 0 && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-bold text-blue-900 mb-2">
                                    {previewRecipients.length} destinatario{previewRecipients.length > 1 ? 's' : ''} recibirán este email
                                </p>
                                <div className="max-h-40 overflow-y-auto">
                                    {previewRecipients.slice(0, 10).map((user, idx) => (
                                        <div key={idx} className="text-xs text-blue-700 py-1">
                                            {user.name} {user.surname} ({user.email}) - {user.role}
                                            {user.client && <span className="text-blue-500"> @ {user.client.name}</span>}
                                        </div>
                                    ))}
                                    {previewRecipients.length > 10 && (
                                        <p className="text-xs text-blue-500 mt-1">
                                            ... y {previewRecipients.length - 10} más
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {previewRecipients.length === 0 && (formData.targetRoles || formData.targetClients || formData.targetWpTypes) && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800">
                                    No hay destinatarios que cumplan con los filtros seleccionados.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={() => setActiveTab("content")}
                                disabled={previewRecipients.length === 0}
                            >
                                Siguiente: Contenido
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="content" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Asunto del Email</Label>
                            <Input
                                value={formData.subject}
                                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Ej: Actualización importante de AM Manager"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cuerpo del Email (HTML)</Label>
                            <Textarea
                                value={formData.htmlBody}
                                onChange={e => setFormData(prev => ({ ...prev, htmlBody: e.target.value }))}
                                className="min-h-[300px] font-mono text-sm"
                                placeholder={`<h2>Título del email</h2>
<p>Hola {name},</p>
<p>Te escribimos para informarte de...</p>
<p><strong>Punto importante:</strong> Recuerda que...</p>
<p>Un saludo,<br/>El equipo de AM Manager</p>`}
                            />
                            <p className="text-xs text-slate-500">
                                Puedes usar HTML y la variable <code className="bg-slate-100 px-1 rounded">{'{name}'}</code> que se reemplazará con el nombre del destinatario.
                            </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-bold text-slate-700 mb-2">Vista previa:</p>
                            <div
                                className="bg-white p-4 rounded border text-sm"
                                dangerouslySetInnerHTML={{ __html: formData.htmlBody.replace(/{name}/g, 'Usuario Ejemplo') }}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="border-t pt-4 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSaveDraft}
                        disabled={!isFormValid || loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Borrador"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
