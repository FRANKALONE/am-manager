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

export function useTranslations() {
    const [locale, setLocale] = useState<Locale>('es');
    const [messages, setMessages] = useState<any>({});

    useEffect(() => {
        const savedLocale = getCookie('NEXT_LOCALE') as Locale || 'es';
        setLocale(savedLocale);

        // Load messages for current locale
        import(`@/messages/${savedLocale}.json`)
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
