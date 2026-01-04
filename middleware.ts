import createMiddleware from 'next-intl/middleware';
import { locales } from './lib/i18n';

export default createMiddleware({
    // A list of all locales that are supported
    locales,

    // Used when no locale matches
    defaultLocale: 'es',

    // Don't use locale prefix for default locale
    localePrefix: 'as-needed'
});

export const config = {
    // Match all pathnames except for:
    // - API routes
    // - _next (Next.js internals)
    // - Static files (images, fonts, etc.)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
