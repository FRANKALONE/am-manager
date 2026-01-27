"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateUserPreferences } from "@/app/actions/user-preferences";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n-config";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";

const timezones = [
    { value: "Europe/Madrid", label: "Europe/Madrid (GMT+1)" },
    { value: "Europe/London", label: "Europe/London (GMT+0)" },
    { value: "Europe/Paris", label: "Europe/Paris (GMT+1)" },
    { value: "Europe/Rome", label: "Europe/Rome (GMT+1)" },
    { value: "Europe/Lisbon", label: "Europe/Lisbon (GMT+0)" },
    { value: "America/New_York", label: "America/New York (GMT-5)" },
    { value: "America/Los_Angeles", label: "America/Los Angeles (GMT-8)" },
    { value: "America/Chicago", label: "America/Chicago (GMT-6)" },
    { value: "America/Sao_Paulo", label: "America/Sao Paulo (GMT-3)" },
    { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+5:30)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
    { value: "Australia/Sydney", label: "Australia/Sydney (GMT+11)" },
];

interface UserPreferencesFormProps {
    userId: string;
    currentLocale: string;
    currentTimezone: string;
    currentDateFormat: string;
}

export function UserPreferencesForm({ userId, currentLocale, currentTimezone, currentDateFormat }: UserPreferencesFormProps) {
    const { t } = useTranslations();
    const router = useRouter();
    const [locale, setLocale] = useState(currentLocale);
    const [timezone, setTimezone] = useState(currentTimezone);
    const [dateFormat, setDateFormat] = useState(currentDateFormat);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateUserPreferences(userId, {
                locale: locale as Locale,
                timezone,
                dateFormat
            });

            if (result.success) {
                // Backup to localStorage for client-side persistence
                try {
                    localStorage.setItem('NEXT_LOCALE', locale);
                    localStorage.setItem('NEXT_DATE_FORMAT', dateFormat);
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                }

                toast.success(t('preferences.successMessage'));

                // Small delay to ensure cookie is set
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                toast.error(result.error || t('preferences.errorMessage'));
            }
        } catch (error) {
            toast.error(t('preferences.errorMessage'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('preferences.title')}</CardTitle>
                <CardDescription>
                    {t('preferences.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="language">{t('preferences.languageLabel')}</Label>
                    <Select value={locale} onValueChange={setLocale}>
                        <SelectTrigger id="language">
                            <SelectValue placeholder={t('preferences.languagePlaceholder')} />
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
                    <Label htmlFor="timezone">{t('preferences.timezoneLabel')}</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone">
                            <SelectValue placeholder={t('preferences.timezonePlaceholder')} />
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

                <div className="space-y-2">
                    <Label htmlFor="date-format">{t('preferences.dateFormatLabel') || 'Formato de Fecha'}</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger id="date-format">
                            <SelectValue placeholder="Seleccionar formato..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (España)</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (USA)</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? t('preferences.saving') : t('preferences.saveButton')}
                </Button>

                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-4">
                        ¿Necesitas ayuda con el funcionamiento de la plataforma? Puedes volver a realizar la guía de bienvenida.
                    </p>
                    <Button
                        variant="outline"
                        className="w-full border-malachite text-jade hover:bg-malachite/5"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
                        }}
                    >
                        Iniciar Guía de Uso
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
