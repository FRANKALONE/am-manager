// Locale configuration - NO MIDDLEWARE APPROACH
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

export const defaultLocale: Locale = 'es';
