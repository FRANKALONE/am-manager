'use client';

import { useEffect, useState } from 'react';
import type { Locale } from './i18n-config';

function getLocale(): Locale {
    if (typeof window === 'undefined') return 'es';

    try {
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

    const t = (key: string): string => {
        if (isLoading) return key;

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
