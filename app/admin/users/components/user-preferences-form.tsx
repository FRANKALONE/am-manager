"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserPreferences } from "@/app/actions/user-preferences";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n";
import { toast } from "sonner";

const timezones = [
    { value: "Europe/Madrid", label: "Europa/Madrid (GMT+1)" },
    { value: "Europe/London", label: "Europa/Londres (GMT+0)" },
    { value: "Europe/Paris", label: "Europa/París (GMT+1)" },
    { value: "Europe/Rome", label: "Europa/Roma (GMT+1)" },
    { value: "Europe/Lisbon", label: "Europa/Lisboa (GMT+0)" },
    { value: "America/New_York", label: "América/Nueva York (GMT-5)" },
    { value: "America/Los_Angeles", label: "América/Los Ángeles (GMT-8)" },
    { value: "America/Chicago", label: "América/Chicago (GMT-6)" },
    { value: "America/Sao_Paulo", label: "América/São Paulo (GMT-3)" },
    { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+5:30)" },
    { value: "Asia/Tokyo", label: "Asia/Tokio (GMT+9)" },
    { value: "Australia/Sydney", label: "Australia/Sídney (GMT+11)" },
];

interface UserPreferencesFormProps {
    userId: string;
    currentLocale: string;
    currentTimezone: string;
}

export function UserPreferencesForm({ userId, currentLocale, currentTimezone }: UserPreferencesFormProps) {
    const router = useRouter();
    const [locale, setLocale] = useState(currentLocale);
    const [timezone, setTimezone] = useState(currentTimezone);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateUserPreferences(userId, { locale, timezone });

            if (result.success) {
                toast.success("Preferencias actualizadas correctamente");
                router.refresh();
            } else {
                toast.error(result.error || "Error al actualizar preferencias");
            }
        } catch (error) {
            toast.error("Error al actualizar preferencias");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferencias de Usuario</CardTitle>
                <CardDescription>
                    Configura tu idioma y zona horaria preferidos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select value={locale} onValueChange={setLocale}>
                        <SelectTrigger id="language">
                            <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(localeNames).map(([code, name]) => (
                                <SelectItem key={code} value={code}>
                                    {localeFlags[code as Locale]} {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone">
                            <SelectValue placeholder="Selecciona una zona horaria" />
                        </SelectTrigger>
                        <SelectContent>
                            {timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? "Guardando..." : "Guardar Preferencias"}
                </Button>
            </CardContent>
        </Card>
    );
}
