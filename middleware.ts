// Temporarily disabled i18n middleware - will be enabled in Phase 2
// import createMiddleware from 'next-intl/middleware';
// import { locales } from './lib/i18n';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pass-through middleware - i18n will be implemented in Phase 2
export function middleware(request: NextRequest) {
    return NextResponse.next();
}

// export default createMiddleware({
//     // A list of all locales that are supported
//     locales,
//
//     // Used when no locale matches
//     defaultLocale: 'es',
//
//     // Don't use locale prefix for default locale
//     localePrefix: 'as-needed'
// });

export const config = {
    // Match all pathnames except for:
    // - API routes
    // - _next (Next.js internals)
    // - Static files (images, fonts, etc.)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
