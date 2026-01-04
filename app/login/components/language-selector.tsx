"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n-config";
import { Globe } from "lucide-react";
import { setLocaleCookie } from "@/lib/preferences-actions";

export function LanguageSelector() {
    const [locale, setLocale] = useState<Locale>("es");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Read from localStorage only
        try {
            const saved = localStorage.getItem('NEXT_LOCALE');
            if (saved && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(saved)) {
                setLocale(saved as Locale);
            }
        } catch (e) {
            console.error('Error reading locale:', e);
        }
    }, []);

    const handleChange = (newLocale: string) => {
        console.log('Language selected:', newLocale);

        // Save to localStorage
        try {
            localStorage.setItem('NEXT_LOCALE', newLocale);
            // Also set as cookie for server-side awareness
            setLocaleCookie(newLocale as Locale);
        } catch (e) {
            console.error('Error saving locale:', e);
        }

        // Update state
        setLocale(newLocale as Locale);

        // Reload page ONCE
        window.location.href = window.location.href;
    };

    if (!isClient) {
        return null; // Don't render on server
    }

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
