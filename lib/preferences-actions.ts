'use server';

import { cookies } from 'next/headers';
import { type Locale } from './i18n-config';

export async function setLocaleCookie(locale: Locale) {
    cookies().set('NEXT_LOCALE', locale, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
    });
}

export async function setTimezoneCookie(timezone: string) {
    cookies().set('NEXT_TIMEZONE', timezone, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
    });
}

export async function setDateFormatCookie(format: string) {
    cookies().set('NEXT_DATE_FORMAT', format, {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
    });
}

