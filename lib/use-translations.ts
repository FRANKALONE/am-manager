'use client';

import { useEffect, useState } from 'react';
import type { Locale } from './i18n-config';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

function getLocale(): Locale {
    // Try cookie first
    let saved = getCookie('NEXT_LOCALE');

    // Fallback to localStorage
    if (!saved && typeof window !== 'undefined') {
        try {
            saved = localStorage.getItem('NEXT_LOCALE');
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    if (saved && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(saved)) {
        return saved as Locale;
    }

    return 'es';
}

export function useTranslations() {
    const [locale, setLocale] = useState<Locale>('es');
    const [messages, setMessages] = useState<any>({});

    useEffect(() => {
        const currentLocale = getLocale();
        setLocale(currentLocale);

        // Load messages for current locale
        import(`@/messages/${currentLocale}.json`)
            .then((module) => setMessages(module.default))
            .catch(() => {
                // Fallback to Spanish if translation file not found
                import('@/messages/es.json').then((module) => setMessages(module.default));
            });
    }, []);

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = messages;

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }

        return value || key;
    };

    return { t, locale };
}
