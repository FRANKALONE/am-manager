import { cookies } from 'next/headers';
import { type Locale, defaultLocale, locales } from './i18n-config';

export function getLocale(): Locale {
    const localeCookie = cookies().get('NEXT_LOCALE')?.value;

    if (localeCookie && locales.includes(localeCookie as Locale)) {
        return localeCookie as Locale;
    }

    return defaultLocale;
}

export async function setLocaleCookie(locale: Locale) {
    'use server';
    cookies().set('NEXT_LOCALE', locale, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
    });
}
