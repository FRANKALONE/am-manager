"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Send, Loader2, CheckSquare, Square, Paperclip, X, Trash2, Image as ImageIcon } from "lucide-react";
import { createMassEmail, updateMassEmail, getEligibleRecipients } from "@/app/actions/mass-emails";
import { RecipientsFilter } from "./recipients-filter";
import { RichTextEditor } from "../../components/rich-text-editor";
import { Checkbox } from "@/components/ui/checkbox";

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
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

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
            if (editingEmail.attachments) {
                try {
                    setAttachments(JSON.parse(editingEmail.attachments));
                } catch (e) {
                    setAttachments([]);
                }
            } else {
                setAttachments([]);
            }
            if (editingEmail.recipients) {
                setSelectedUserIds(editingEmail.recipients.map((r: any) => r.userId));

                // Also fetch full recipients for preview
                getEligibleRecipients({
                    targetRoles: editingEmail.targetRoles,
                    targetClients: editingEmail.targetClients,
                    targetWpTypes: editingEmail.targetWpTypes
                }).then(setPreviewRecipients);
            }
        } else {
            setFormData({
                subject: "",
                htmlBody: "",
                targetRoles: "",
                targetClients: "",
                targetWpTypes: ""
            });
            setSelectedUserIds([]);
            setPreviewRecipients([]);
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

        // Select all by default when filters change
        setSelectedUserIds(recipients.map(r => r.id));
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedUserIds.length === previewRecipients.length && previewRecipients.length > 0) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(previewRecipients.map(r => r.id));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setUploading(true);
        const newAttachments = [...attachments];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload-attachment', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();
                if (result.success) {
                    newAttachments.push({
                        name: file.name,
                        url: result.url,
                        type: file.type,
                        size: file.size
                    });
                } else {
                    alert(`Error subiendo ${file.name}: ${result.error}`);
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert(`Error de red al subir ${file.name}`);
            }
        }

        setAttachments(newAttachments);
        setUploading(false);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            if (editingEmail) {
                const result = await updateMassEmail(editingEmail.id, {
                    ...formData,
                    selectedUserIds,
                    attachments
                });
                if (result.success) {
                    onSave();
                    onClose();
                }
            } else {
                const result = await createMassEmail({
                    ...formData,
                    selectedUserIds,
                    createdBy: userId,
                    attachments
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
        selectedUserIds.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-blue-500" />
                        {editingEmail ? "Editar Email Masivo" : "Nuevo Email Masivo"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="recipients" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="recipients" active={activeTab === 'recipients'} onClick={() => setActiveTab('recipients')}>
                            <Users className="w-4 h-4 mr-2" />
                            1. Destinatarios
                        </TabsTrigger>
                        <TabsTrigger value="content" active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                            <FileText className="w-4 h-4 mr-2" />
                            2. Contenido
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="recipients" active={activeTab === 'recipients'} className="space-y-4 mt-4">
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
                                <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-100">
                                    <p className="text-sm font-bold text-blue-900">
                                        {selectedUserIds.length} destinatario{selectedUserIds.length !== 1 ? 's' : ''} seleccionado{selectedUserIds.length !== 1 ? 's' : ''}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs bg-white"
                                        onClick={toggleSelectAll}
                                    >
                                        {selectedUserIds.length === previewRecipients.length
                                            ? "Desmarcar Todos"
                                            : "Seleccionar Todos"}
                                    </Button>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                                    {previewRecipients.map((user, idx) => (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-3 p-2 rounded-md transition-colors ${selectedUserIds.includes(user.id) ? 'bg-white shadow-sm' : 'opacity-60'
                                                }`}
                                        >
                                            <Checkbox
                                                id={`user-${user.id}`}
                                                checked={selectedUserIds.includes(user.id)}
                                                onCheckedChange={() => toggleUserSelection(user.id)}
                                            />
                                            <label
                                                htmlFor={`user-${user.id}`}
                                                className="flex-1 text-xs text-blue-800 cursor-pointer select-none"
                                            >
                                                <span className="font-bold">{user.name} {user.surname}</span>
                                                <span className="mx-1 text-blue-400">({user.email})</span>
                                                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-[10px] ml-1 uppercase font-bold text-blue-600">
                                                    {user.role}
                                                </span>
                                                {user.client && (
                                                    <span className="text-blue-500 ml-2">@ {user.client.name}</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
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
                                disabled={selectedUserIds.length === 0}
                            >
                                Siguiente: Contenido
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="content" active={activeTab === 'content'} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Asunto del Email</Label>
                            <Input
                                value={formData.subject}
                                onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Ej: Actualización importante de AM Manager"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <Label className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-slate-500" />
                                Archivos Adjuntos (PDF, Excel, Imágenes...)
                            </Label>

                            <div className="flex flex-wrap gap-2">
                                {attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 group">
                                        <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">{att.name}</span>
                                        <button
                                            onClick={() => removeAttachment(i)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                <div className="relative">
                                    <Input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        id="attachment-upload"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading}
                                        className="h-8 rounded-full border-dashed"
                                    >
                                        <label htmlFor="attachment-upload" className="cursor-pointer">
                                            {uploading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Paperclip className="w-3 h-3 mr-2" />}
                                            Subir Archivo
                                        </label>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Cuerpo del Email (Editor Visual)</Label>
                            <RichTextEditor
                                value={formData.htmlBody}
                                onChange={html => setFormData(prev => ({ ...prev, htmlBody: html }))}
                                placeholder="Escribe tu mensaje aquí..."
                            />
                            <p className="text-xs text-slate-500">
                                Usa la barra de herramientas para dar formato. La variable <code className="bg-slate-100 px-1 rounded">{'{name}'}</code> se reemplazará con el nombre del destinatario.
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
