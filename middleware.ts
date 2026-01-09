import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const userId = request.cookies.get('user_id')?.value;
    const userRole = request.cookies.get('user_role')?.value;
    const { pathname } = request.nextUrl;

    const userPermissions = (() => {
        const perms = request.cookies.get('user_permissions')?.value;
        if (!perms) return {};
        try {
            return JSON.parse(decodeURIComponent(perms));
        } catch (e) {
            return {};
        }
    })();

    // Public paths
    const publicPaths = ['/login', '/', '/login/forgot-password', '/login/reset-password'];
    if (publicPaths.includes(pathname)) {
        if (userId) {
            // If already logged in, redirect to appropriate home
            if (userRole === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin-home', request.url));
            } else if (userPermissions.view_dashboard) {
                return NextResponse.redirect(new URL('/manager-dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/client-dashboard', request.url));
            }
        }
        return NextResponse.next();
    }

    // Protected paths check
    if (!userId) {
        // Redirigir al login si no hay sesin
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Permission-based access control
    // Admin/Management sections
    if (pathname.startsWith('/admin') || pathname.startsWith('/cierres')) {
        const hasAdminPermission = userRole === 'ADMIN' ||
            userPermissions.manage_administration ||
            userPermissions.manage_users ||
            userPermissions.manage_roles ||
            userPermissions.view_cierres;

        if (!hasAdminPermission) {
            if (userPermissions.view_dashboard) {
                return NextResponse.redirect(new URL('/manager-dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/client-dashboard', request.url));
            }
        }
    }

    // Manager dashboard
    if (pathname.startsWith('/manager-dashboard')) {
        if (userRole !== 'ADMIN' && !userPermissions.view_dashboard) {
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
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
