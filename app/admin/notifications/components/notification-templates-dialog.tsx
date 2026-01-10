"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Mail, AppWindow, Code, ShieldCheck, Languages } from "lucide-react";
import { RichTextEditor } from "../../components/rich-text-editor";

interface TemplateData {
    id: string;
    title: string;
    appMessage: string;
    emailSubject: string;
    emailMessage: string;
    roles: string;
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
    const [activeTab, setActiveTab] = useState("app");
    const [selectedLang, setSelectedLang] = useState<"es" | "en" | "it">("es");

    const languages = [
        { id: "es", label: "Español", flag: "🇪🇸" },
        { id: "en", label: "English", flag: "🇬🇧" },
        { id: "it", label: "Italiano", flag: "🇮🇹" }
    ];

    useEffect(() => {
        if (template) {
            setFormData({
                appMessage: template.appMessage || "",
                emailSubject: template.emailSubject || "",
                emailMessage: template.emailMessage || "",
                roles: template.roles || ""
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

    const updateNestedField = (field: string, lang: string, value: string) => {
        setFormData(prev => {
            const currentRaw = prev[field as keyof TemplateData] || "{}";
            let trans: any = {};
            try {
                trans = JSON.parse(currentRaw as string);
            } catch (e) {
                // If it was plain text, put it in 'es'
                trans = { es: currentRaw };
            }
            trans[lang] = value;
            return {
                ...prev,
                [field]: JSON.stringify(trans)
            };
        });
    };

    const getFieldValue = (field: string, lang: string) => {
        const raw = formData[field as keyof TemplateData] || "";
        try {
            const trans = JSON.parse(raw as string);
            return trans[lang] || "";
        } catch (e) {
            return lang === 'es' ? raw as string : "";
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
                        Configurar Notificación: {template?.title}
                    </DialogTitle>
                    <DialogDescription>
                        Personaliza los destinatarios y mensajes del flujo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Tabs defaultValue="app" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1">
                            <TabsTrigger
                                value="app"
                                active={activeTab === 'app'}
                                onClick={() => setActiveTab('app')}
                                className="flex items-center gap-2"
                            >
                                <AppWindow className="w-4 h-4" /> App
                            </TabsTrigger>
                            <TabsTrigger
                                value="email"
                                active={activeTab === 'email'}
                                onClick={() => setActiveTab('email')}
                                className="flex items-center gap-2"
                            >
                                <Mail className="w-4 h-4" /> Email
                            </TabsTrigger>
                            <TabsTrigger
                                value="roles"
                                active={activeTab === 'roles'}
                                onClick={() => setActiveTab('roles')}
                                className="flex items-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> Roles
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b mb-4">
                            {languages.map(lang => (
                                <Button
                                    key={lang.id}
                                    type="button"
                                    variant={selectedLang === lang.id ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 rounded-full text-xs gap-1.5 ${selectedLang === lang.id ? 'bg-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                                    onClick={() => setSelectedLang(lang.id as any)}
                                >
                                    <span>{lang.flag}</span>
                                    {lang.label}
                                </Button>
                            ))}
                        </div>

                        <TabsContent value="app" active={activeTab === 'app'} className="space-y-4 pt-4 border-none shadow-none">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Mensaje en la App ({selectedLang.toUpperCase()})</Label>
                                <RichTextEditor
                                    value={getFieldValue('appMessage', selectedLang)}
                                    onChange={val => updateNestedField('appMessage', selectedLang, val)}
                                    placeholder="Ej: El contrato {wpName} ha sido renovado..."
                                />
                                <p className="text-[10px] text-slate-400">
                                    Este mensaje aparecerá en el panel de notificaciones del usuario.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="email" active={activeTab === 'email'} className="space-y-4 pt-4 border-none shadow-none">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Asunto del Email ({selectedLang.toUpperCase()})</Label>
                                <Input
                                    value={getFieldValue('emailSubject', selectedLang)}
                                    onChange={e => updateNestedField('emailSubject', selectedLang, e.target.value)}
                                    placeholder="Ej: ✅ Renovación: {clientName}"
                                    className="bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Cuerpo del Email ({selectedLang.toUpperCase()})</Label>
                                <RichTextEditor
                                    value={getFieldValue('emailMessage', selectedLang)}
                                    onChange={val => updateNestedField('emailMessage', selectedLang, val)}
                                    placeholder="Hola {name}, te informamos que..."
                                />
                                <p className="text-[10px] text-slate-400">El sistema añadirá automáticamente el saludo "Hola [Nombre]" y un pie de página estándar.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="roles" active={activeTab === 'roles'} className="space-y-4 pt-4 border-none shadow-none">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold">Roles de Destinatarios</Label>
                                <Input
                                    value={formData.roles}
                                    onChange={e => setFormData(prev => ({ ...prev, roles: e.target.value.toUpperCase() }))}
                                    placeholder="Ej: ADMIN, GERENTE, CLIENT_USER"
                                    className="bg-slate-50/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        <strong>Nota:</strong> Separa los roles por comas.
                                        Los roles estándar son: <code className="font-bold">ADMIN</code>, <code className="font-bold">GERENTE</code>, <code className="font-bold">COLABORADOR</code>, <code className="font-bold">USER</code>.
                                        Para notificaciones de cliente, usa <code className="font-bold">USER</code> para notificar al contacto del cliente.
                                    </p>
                                </div>
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
