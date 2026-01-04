"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n-config";
import { Globe } from "lucide-react";

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

export function LanguageSelector() {
    const [locale, setLocale] = useState<Locale>("es");

    // Read cookie on mount
    useEffect(() => {
        const savedLocale = getCookie('NEXT_LOCALE');
        if (savedLocale && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(savedLocale)) {
            setLocale(savedLocale as Locale);
        }
    }, []);

    const handleChange = (newLocale: string) => {
        setLocale(newLocale as Locale);
        // Set cookie with proper attributes
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        // Reload to apply language
        window.location.reload();
    };

    return (
        <div className="flex items-center justify-center gap-2 w-full">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={locale} onValueChange={handleChange}>
                <SelectTrigger className="w-full">
                    <SelectValue />
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
    );
}
