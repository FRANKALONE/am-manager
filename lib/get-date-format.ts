export const defaultDateFormat = 'DD/MM/YYYY';

export function getDateFormat(): string {
    if (typeof window !== 'undefined') {
        // Client side
        const match = document.cookie.match(new RegExp('(^| )NEXT_DATE_FORMAT=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : defaultDateFormat;
    }

    // Server side
    try {
        const { cookies } = require('next/headers');
        const dateFormatCookie = cookies().get('NEXT_DATE_FORMAT')?.value;

        if (dateFormatCookie) {
            return dateFormatCookie;
        }
    } catch (e) {
        // Fallback
    }

    return defaultDateFormat;
}
