import { getLocale } from './get-locale';

export async function getTranslations() {
    const locale = getLocale();

    let messages;
    try {
        messages = (await import(`@/messages/${locale}.json`)).default;
    } catch (error) {
        messages = (await import(`@/messages/es.json`)).default;
    }

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
