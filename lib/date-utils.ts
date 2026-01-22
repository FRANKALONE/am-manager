import { getTimezone } from './get-timezone';
import { getLocale } from './get-locale';
import { getDateFormat } from './get-date-format';
import { format as dateFnsFormat } from 'date-fns';

/**
 * Formats a date according to the user's locale and timezone.
 * Works in Server Components.
 */
export function formatDate(date: Date | string | number, options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
}) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    // If options specifically only ask for date (Y, M, D) without time, 
    // we use our formatShortDate which respects user preference
    const isShortDate = options.year && options.month && options.day &&
        !options.hour && !options.minute && !options.second;

    if (isShortDate) {
        return formatShortDate(date);
    }

    const locale = getLocale();
    const timeZone = getTimezone();

    return new Intl.DateTimeFormat(locale, {
        ...options,
        timeZone,
    }).format(d);
}

/**
 * Returns the current time adjusted to the user's timezone.
 */
export function getNow(): Date {
    const timeZone = getTimezone();
    const now = new Date();
    const userTime = now.toLocaleString("en-US", { timeZone });
    return new Date(userTime);
}

/**
 * Returns the start of today adjusted to the user's timezone.
 */
export function getStartOfToday(): Date {
    const now = getNow();
    now.setHours(0, 0, 0, 0);
    return now;
}

/**
 * Converts a UTC date to the user's preferred timezone.
 */
export function toUserTimezone(date: Date | string | number): Date {
    const timeZone = getTimezone();
    const d = new Date(date);
    const userTime = d.toLocaleString("en-US", { timeZone });
    return new Date(userTime);
}

/**
 * Short date format: DD/MM/YYYY (depending on locale or user preference)
 */
export function formatShortDate(date: Date | string | number) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const formatStr = getDateFormat();

    // Map common user preference formats to date-fns tokens
    let fnsFormat = 'dd/MM/yyyy';
    if (formatStr === 'MM/DD/YYYY') fnsFormat = 'MM/dd/yyyy';
    if (formatStr === 'YYYY-MM-DD') fnsFormat = 'yyyy-MM-dd';
    if (formatStr === 'DD-MM-YYYY') fnsFormat = 'dd-MM-yyyy';

    return dateFnsFormat(d, fnsFormat);
}

/**
 * Time only format: HH:mm:ss
 */
export function formatTime(date: Date | string | number) {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}
