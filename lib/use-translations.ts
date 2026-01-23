'use client';

import { useEffect, useState } from 'react';
import type { Locale } from './i18n-config';

function getLocale(): Locale {
    if (typeof window === 'undefined') return 'es';

    try {
        // 1. Try cookie (most reliable, set by server and client)
        const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'));
        const cookieValue = match ? decodeURIComponent(match[2]) : null;
        if (cookieValue && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(cookieValue)) {
            return cookieValue as Locale;
        }

        // 2. Try localStorage (fallback)
        const saved = localStorage.getItem('NEXT_LOCALE');
        if (saved && ['es', 'en', 'pt', 'it', 'fr', 'hi'].includes(saved)) {
            return saved as Locale;
        }
    } catch (e) {
        // Ignore errors
    }

    return 'es';
}

export function useTranslations() {
    const [messages, setMessages] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [locale] = useState<Locale>(getLocale());

    useEffect(() => {
        // Load messages only once
        import(`@/messages/${locale}.json`)
            .then((module) => {
                setMessages(module.default);
                setIsLoading(false);
            })
            .catch(() => {
                import('@/messages/es.json').then((module) => {
                    setMessages(module.default);
                    setIsLoading(false);
                });
            });
    }, []); // CRITICAL: Empty array - only run once!

    const t = (key: string, options?: Record<string, any>): string => {
        if (isLoading) return options?.defaultValue || key;

        const keys = key.split('.');
        let value: any = messages;

        for (const k of keys) {
            value = value?.[k];
        }

        if (value === undefined || value === null) {
            return options?.defaultValue || key;
        }

        if (typeof value === 'string' && options) {
            Object.entries(options).forEach(([k, v]) => {
                if (k !== 'defaultValue') {
                    value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
                }
            });
        }

        return typeof value === 'string' ? value : key;
    };

    return { t, locale };
}
