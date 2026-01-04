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

function setCookie(name: string, value: string) {
    // Set cookie with multiple strategies for maximum compatibility
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    // Also save to localStorage as backup
    try {
        localStorage.setItem(name, value);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function getLocale(): Locale {
    // Try cookie first
    let saved = getCookie('NEXT_LOCALE');

    // Fallback to localStorage
    if (!saved && typeof window !== 'undefined') {
        try {
            saved = localStorage.getItem('NEXT_LOCALE');
        } catch (e) {
            console.error('Failed to read from localStorage:', e);
        }
    }

    if (saved && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(saved)) {
        return saved as Locale;
    }

    return 'es';
}

export function LanguageSelector() {
    const [locale, setLocale] = useState<Locale>('es');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const currentLocale = getLocale();
        setLocale(currentLocale);
    }, []);

    const handleChange = (newLocale: string) => {
        console.log('Changing language to:', newLocale);
        setLocale(newLocale as Locale);
        setCookie('NEXT_LOCALE', newLocale);

        // Small delay before reload to ensure cookie is set
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    if (!mounted) {
        return (
            <div className="flex items-center justify-center gap-2 w-full">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select disabled>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Loading..." />
                    </SelectTrigger>
                </Select>
            </div>
        );
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
