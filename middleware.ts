import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Get session from JWT
    const sessionToken = request.cookies.get('session')?.value;
    const session = sessionToken ? await decrypt(sessionToken) : null;

    // 2. Auth context (Prioritize JWT, fallback to legacy for transition)
    const userId = session?.userId || request.cookies.get('user_id')?.value;
    const userRole = session?.userRole || request.cookies.get('user_role')?.value;

    const userPermissions = (() => {
        const perms = request.cookies.get('user_permissions')?.value;
        if (!perms) return {};
        try {
            return JSON.parse(decodeURIComponent(perms));
        } catch (e) {
            return {};
        }
    })();

    // 3. Public paths
    const publicPaths = ['/login', '/', '/login/forgot-password', '/login/reset-password'];

    // 4. API protection
    if (pathname.startsWith('/api/')) {
        // Allow public API routes (like login itself if it were an API route, or public hooks)
        const publicApiPaths: string[] = [];

        if (!userId && !publicApiPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (publicPaths.includes(pathname)) {
        if (userId) {
            // If already logged in, redirect to appropriate home based on permissions
            if (userRole === 'ADMIN' || userPermissions.view_admin_dashboard) {
                return NextResponse.redirect(new URL('/admin-home', request.url));
            } else if (userPermissions.view_manager_dashboard) {
                return NextResponse.redirect(new URL('/manager-dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/client-dashboard', request.url));
            }
        }
        return NextResponse.next();
    }

    // Protected paths check
    if (!userId) {
        // Redirect to login if no session
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
            if (userPermissions.view_manager_dashboard) {
                return NextResponse.redirect(new URL('/manager-dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/client-dashboard', request.url));
            }
        }
    }

    // Manager dashboard
    if (pathname.startsWith('/manager-dashboard')) {
        if (userRole !== 'ADMIN' && !userPermissions.view_manager_dashboard) {
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
    }

    // Analytics module
    if (pathname.startsWith('/analytics')) {
        if (userRole !== 'ADMIN' && !userPermissions.view_analytics) {
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
    }

    const canViewEvoAdmin = userRole === 'ADMIN' || userPermissions.view_evolutivos_admin || userPermissions.view_evolutivos_standard;
    if (pathname === '/evolutivos') {
        if (!canViewEvoAdmin) {
            if (userPermissions.view_evolutivos_client) {
                return NextResponse.redirect(new URL('/dashboard/evolutivos', request.url));
            }
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
    }

    if (pathname === '/dashboard/evolutivos') {
        if (userRole !== 'ADMIN' && !userPermissions.view_evolutivos_client) {
            if (userPermissions.view_evolutivos_admin) {
                return NextResponse.redirect(new URL('/evolutivos', request.url));
            }
            return NextResponse.redirect(new URL('/client-dashboard', request.url));
        }
    }

    // Security headers
    const response = NextResponse.next();

    // Content Security Policy
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

// Config matching all paths except static files and next internals
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-am.*).*)'],
};
