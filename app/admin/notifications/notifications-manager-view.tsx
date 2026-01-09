"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, CreditCard, ClipboardList, Info, AlertTriangle, Code, AppWindow, Mail } from "lucide-react";
import { updateNotificationSetting } from "@/app/actions/notifications";
import { toast } from "sonner";
import { NotificationTemplatesDialog } from "./components/notification-templates-dialog";

interface Settings {
    id: string;
    type: string;
    title: string;
    description: string | null;
    isEnabled: boolean;
    sendEmail: boolean;
    roles: string;
    group: string;
    appMessage: string | null;
    emailSubject: string | null;
    emailMessage: string | null;
}

export function NotificationsManagerView({ initialSettings }: { initialSettings: Settings[] }) {
    const [settings, setSettings] = useState<Settings[]>(initialSettings);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Settings | null>(null);

    const handleUpdate = async (id: string, data: Partial<Settings>) => {
        setLoadingId(id);
        try {
            // Convert nulls to undefined for the server action
            const cleanData = Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
            );
            const result = await updateNotificationSetting(id, cleanData as any);
            if (result.success) {
                setSettings((prev: Settings[]) => prev.map((s: Settings) => s.id === id ? { ...s, ...data } : s));
                toast.success("Configuración actualizada");
            } else {
                toast.error("Error: " + result.error);
            }
        } catch (error) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoadingId(null);
        }
    };

    const getGroupIcon = (group: string) => {
        switch (group) {
            case 'CONTRACTS': return <ClipboardList className="w-5 h-5 text-blue-500" />;
            case 'FINANCIAL': return <CreditCard className="w-5 h-5 text-emerald-500" />;
            case 'CLAIMS': return <ShieldCheck className="w-5 h-5 text-amber-500" />;
            case 'SYSTEM': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
            default: return <Bell className="w-5 h-5 text-slate-500" />;
        }
    };

    const groups = Array.from(new Set(settings.map((s: Settings) => s.group)));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map(group => (
                <Card key={group} className="border-none shadow-md overflow-hidden bg-white/60 backdrop-blur-sm">
                    <CardHeader className="bg-white/80 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                {getGroupIcon(group)}
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-800">
                                    {group === 'GENERAL' ? 'Notificaciones Generales' :
                                        group === 'CONTRACTS' ? 'Contratos y Vigencias' :
                                            group === 'FINANCIAL' ? 'Facturación y Cierres' :
                                                group === 'CLAIMS' ? 'Reclamaciones y Claims' : group}
                                </CardTitle>
                                <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">
                                    Módulo de {group.toLowerCase()}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {settings.filter((s: Settings) => s.group === group).map((setting: Settings) => (
                                <div key={setting.id} className="p-5 flex flex-col gap-4 hover:bg-white/40 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700">{setting.title}</span>
                                                <div className="flex gap-1">
                                                    {setting.roles.split(',').map((role: string) => (
                                                        <Badge key={role} variant="outline" className="text-[9px] px-1.5 py-0 font-bold bg-slate-50 text-slate-400 border-slate-200">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                                                {setting.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-[11px] font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                                                onClick={() => setEditingTemplate(setting)}
                                            >
                                                <Code className="w-3.5 h-3.5 mr-1.5" />
                                                Plantillas
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100/50">
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100/50">
                                            <div className="flex items-center gap-2">
                                                <AppWindow className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">App Notification</span>
                                            </div>
                                            <Switch
                                                checked={setting.isEnabled}
                                                onCheckedChange={() => handleUpdate(setting.id, { isEnabled: !setting.isEnabled })}
                                                disabled={loadingId === setting.id}
                                                className="scale-75 data-[state=checked]:bg-malachite"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100/50">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Email Alert</span>
                                            </div>
                                            <Switch
                                                checked={setting.sendEmail}
                                                onCheckedChange={() => handleUpdate(setting.id, { sendEmail: !setting.sendEmail })}
                                                disabled={loadingId === setting.id}
                                                className="scale-75 data-[state=checked]:bg-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <NotificationTemplatesDialog
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                onSave={(data) => handleUpdate(editingTemplate!.id, data as any)}
                template={editingTemplate ? {
                    id: editingTemplate.id,
                    title: editingTemplate.title,
                    appMessage: editingTemplate.appMessage || "",
                    emailSubject: editingTemplate.emailSubject || "",
                    emailMessage: editingTemplate.emailMessage || "",
                    type: editingTemplate.type
                } : null}
            />

            {settings.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                    <Info className="w-10 h-10 mx-auto opacity-20 mb-4" />
                    <p className="font-medium italic">No se han definido flujos de notificación.</p>
                </div>
            )}
        </div>
    );
}
