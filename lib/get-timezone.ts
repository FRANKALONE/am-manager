export const defaultTimezone = 'Europe/Madrid';

export function getTimezone(): string {
    if (typeof window !== 'undefined') {
        // Client side
        const match = document.cookie.match(new RegExp('(^| )NEXT_TIMEZONE=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : defaultTimezone;
    }

    // Server side
    try {
        const { cookies } = require('next/headers');
        const timezoneCookie = cookies().get('NEXT_TIMEZONE')?.value;

        if (timezoneCookie) {
            return timezoneCookie;
        }
    } catch (e) {
        // Fallback
    }

    return defaultTimezone;
}
