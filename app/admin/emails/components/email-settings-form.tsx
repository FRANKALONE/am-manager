"use client";

import { useState } from "react";
import { updateEmailSettings } from "@/app/actions/email-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export function EmailSettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        SMTP_HOST: initialSettings.SMTP_HOST || "",
        SMTP_PORT: initialSettings.SMTP_PORT || "587",
        SMTP_USER: initialSettings.SMTP_USER || "",
        SMTP_PASS: initialSettings.SMTP_PASS || "",
        SMTP_FROM: initialSettings.SMTP_FROM || "",
        EMAIL_REDIRECT_GLOBAL: initialSettings.EMAIL_REDIRECT_GLOBAL || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await updateEmailSettings(settings);
            if (result.success) {
                toast.success("Configuración guardada correctamente");
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="SMTP_HOST">Host SMTP</Label>
                    <Input
                        id="SMTP_HOST"
                        name="SMTP_HOST"
                        value={settings.SMTP_HOST}
                        onChange={handleChange}
                        placeholder="smtp.example.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_PORT">Puerto SMTP</Label>
                    <Input
                        id="SMTP_PORT"
                        name="SMTP_PORT"
                        value={settings.SMTP_PORT}
                        onChange={handleChange}
                        placeholder="587"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_USER">Usuario SMTP</Label>
                    <Input
                        id="SMTP_USER"
                        name="SMTP_USER"
                        value={settings.SMTP_USER}
                        onChange={handleChange}
                        placeholder="usuario@dominio.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_PASS">Contraseña SMTP</Label>
                    <Input
                        id="SMTP_PASS"
                        name="SMTP_PASS"
                        type="password"
                        value={settings.SMTP_PASS}
                        onChange={handleChange}
                        placeholder="••••••••"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_FROM">Remitente (Email)</Label>
                    <Input
                        id="SMTP_FROM"
                        name="SMTP_FROM"
                        value={settings.SMTP_FROM}
                        onChange={handleChange}
                        placeholder="no-reply@dominio.com"
                    />
                </div>
            </div>

            <div className="border-t pt-6">
                <div className="space-y-2">
                    <Label htmlFor="EMAIL_REDIRECT_GLOBAL" className="text-blue-600 font-bold">Email de Redirección Global (Override)</Label>
                    <Input
                        id="EMAIL_REDIRECT_GLOBAL"
                        name="EMAIL_REDIRECT_GLOBAL"
                        value={settings.EMAIL_REDIRECT_GLOBAL}
                        onChange={handleChange}
                        placeholder="Si se rellena, todos los correos irán aquí para pruebas"
                        className="border-blue-200"
                    />
                    <p className="text-xs text-muted-foreground">
                        Si este campo tiene un valor, **ningún usuario real recibirá correos**. Todos los envíos se desviarán a esta dirección. Déjalo vacío para envíos reales.
                    </p>
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Configuración
            </Button>
        </form>
    );
}
