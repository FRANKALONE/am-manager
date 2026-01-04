import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported locales
export const locales = ['es', 'en', 'pt', 'it', 'fr', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    it: 'Italiano',
    fr: 'Français',
    hi: 'हिन्दी'
};

export const localeFlags: Record<Locale, string> = {
    es: '🇪🇸',
    en: '🇬🇧',
    pt: '🇵🇹',
    it: '🇮🇹',
    fr: '🇫🇷',
    hi: '🇮🇳'
};

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as Locale)) notFound();

    return {
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
