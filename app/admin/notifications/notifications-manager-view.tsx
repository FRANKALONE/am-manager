"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, CreditCard, ClipboardList, Info, AlertTriangle } from "lucide-react";
import { updateNotificationSetting } from "@/app/actions/notifications";
import { toast } from "sonner";

interface Settings {
    id: string;
    type: string;
    title: string;
    description: string | null;
    isEnabled: boolean;
    roles: string;
    group: string;
}

export function NotificationsManagerView({ initialSettings }: { initialSettings: any[] }) {
    const [settings, setSettings] = useState<Settings[]>(initialSettings);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleToggle = async (id: string, currentState: boolean) => {
        setLoadingId(id);
        try {
            const result = await updateNotificationSetting(id, !currentState);
            if (result.success) {
                setSettings(prev => prev.map(s => s.id === id ? { ...s, isEnabled: !currentState } : s));
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

    const groups = Array.from(new Set(settings.map(s => s.group)));

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
                            {settings.filter(s => s.group === group).map(setting => (
                                <div key={setting.id} className="p-4 flex items-start justify-between gap-4 hover:bg-white/40 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">{setting.title}</span>
                                            <div className="flex gap-1">
                                                {setting.roles.split(',').map(role => (
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
                                    <div className="flex items-center pt-1">
                                        <Switch
                                            checked={setting.isEnabled}
                                            onCheckedChange={() => handleToggle(setting.id, setting.isEnabled)}
                                            disabled={loadingId === setting.id}
                                            className="data-[state=checked]:bg-malachite"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            {settings.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                    <Info className="w-10 h-10 mx-auto opacity-20 mb-4" />
                    <p className="font-medium italic">No se han definido flujos de notificación.</p>
                </div>
            )}
        </div>
    );
}
