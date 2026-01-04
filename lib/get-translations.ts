import { getLocale } from './get-locale';

export async function getTranslations() {
    const locale = getLocale();

    let messages;
    try {
        messages = (await import(`@/messages/${locale}.json`)).default;
    } catch (error) {
        messages = (await import(`@/messages/es.json`)).default;
    }

    const t = (key: string, options?: Record<string, any>): string => {
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
