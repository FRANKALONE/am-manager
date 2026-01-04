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
    const [messages, setMessages] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const locale = getLocale(); // Get locale once, don't put in state

    useEffect(() => {
        // Load messages for current locale - only runs once on mount
        import(`@/messages/${locale}.json`)
            .then((module) => {
                setMessages(module.default);
                setIsLoading(false);
            })
            .catch(() => {
                // Fallback to Spanish if translation file not found
                import('@/messages/es.json').then((module) => {
                    setMessages(module.default);
                    setIsLoading(false);
                });
            });
    }, []); // Empty dependency array - only run once

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
