import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const userId = request.cookies.get('user_id')?.value;
    const userRole = request.cookies.get('user_role')?.value;
    const { pathname } = request.nextUrl;

    // Public paths
    if (pathname === '/login' || pathname === '/') {
        if (userId) {
            // If already logged in, redirect to appropriate home
            return NextResponse.redirect(new URL(userRole === 'ADMIN' ? '/admin-home' : '/client-dashboard', request.url));
        }
        return NextResponse.next();
    }

    // Protected paths check
    if (!userId) {
        // Redirigir al login si no hay sesión
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based access control
    // Admin only sections
    if (pathname.startsWith('/admin') || pathname.startsWith('/cierres')) {
        if (userRole !== 'ADMIN') {
            // If not admin, redirect to client dashboard
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
    }

    // Client sections (Admins can also see them for support/testing)
    if (pathname.startsWith('/client-dashboard')) {
        // No specific restriction other than being logged in
    }

    // Security headers
    const response = NextResponse.next();

    // Content Security Policy
    // We use a relatively permissive policy for now to avoid breaking existing functionality,
    // but we can tighten it further as needed.
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data:;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
}

// Config matching all paths except static files, api, and next internals
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo-am.*).*)'],
};
