"use client";

import { useState } from "react";
import { updateEmailSettings } from "@/app/actions/email-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export function EmailSettingsForm({ initialSettings, t }: { initialSettings: Record<string, string>, t: any }) {
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
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="SMTP_HOST">{t('admin.emails.settings.host')}</Label>
                    <Input id="SMTP_HOST" name="SMTP_HOST" value={settings.SMTP_HOST} onChange={handleChange} placeholder="smtp.office365.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_PORT">{t('admin.emails.settings.port')}</Label>
                    <Input id="SMTP_PORT" name="SMTP_PORT" value={settings.SMTP_PORT} onChange={handleChange} placeholder="587" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_USER">{t('admin.emails.settings.user')}</Label>
                    <Input id="SMTP_USER" name="SMTP_USER" value={settings.SMTP_USER} onChange={handleChange} placeholder="user@domain.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_PASS">{t('admin.emails.settings.pass')}</Label>
                    <Input id="SMTP_PASS" name="SMTP_PASS" type="password" value={settings.SMTP_PASS} onChange={handleChange} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="SMTP_FROM">{t('admin.emails.settings.from')}</Label>
                    <Input id="SMTP_FROM" name="SMTP_FROM" value={settings.SMTP_FROM} onChange={handleChange} placeholder="no-reply@domain.com" />
                </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="EMAIL_REDIRECT_GLOBAL">{t('admin.emails.settings.redirect')}</Label>
                <Input id="EMAIL_REDIRECT_GLOBAL" name="EMAIL_REDIRECT_GLOBAL" value={settings.EMAIL_REDIRECT_GLOBAL} onChange={handleChange} placeholder="test@domain.com" />
                <p className="text-xs text-muted-foreground italic">
                    {t('admin.emails.settings.redirectHelp')}
                </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t('admin.emails.settings.save')}
            </Button>
        </form>
    );
}
