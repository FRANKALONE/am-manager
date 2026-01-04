import { type Locale, defaultLocale, locales } from './i18n-config';

export function getLocale(): Locale {
    if (typeof window !== 'undefined') {
        // Client side
        const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE=([^;]+)'));
        const value = match ? decodeURIComponent(match[2]) : null;
        if (value && locales.includes(value as Locale)) {
            return value as Locale;
        }
        return defaultLocale;
    }

    // Server side
    try {
        const { cookies } = require('next/headers');
        const localeCookie = cookies().get('NEXT_LOCALE')?.value;

        if (localeCookie && locales.includes(localeCookie as Locale)) {
            return localeCookie as Locale;
        }
    } catch (e) {
        // Fallback
    }

    return defaultLocale;
}
