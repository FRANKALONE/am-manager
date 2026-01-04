"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n-config";
import { Globe } from "lucide-react";

export function LanguageSelector() {
    const [locale, setLocale] = useState<Locale>("es");

    const handleChange = (newLocale: string) => {
        setLocale(newLocale as Locale);
        // Set cookie and reload
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
        window.location.reload();
    };

    return (
        <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={locale} onValueChange={handleChange}>
                <SelectTrigger className="w-[160px] h-9">
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
