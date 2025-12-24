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

    return NextResponse.next();
}

// Config matching all paths except static files, api, and next internals
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo-am.*).*)'],
};
