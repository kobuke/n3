import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const staffSecret = request.cookies.get('nanjo_staff_secret')?.value

    // 1. Skip if it's an internal Next.js path or a static file
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/images') ||
        pathname.includes('.') ||
        ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/sw.js'].includes(pathname)
    ) {
        return NextResponse.next()
    }

    // 2. Staff Routes Logic (Exclude from i18n prefixing)
    if (pathname.startsWith('/staff')) {
        if (pathname !== '/staff/login' && !staffSecret) {
            return NextResponse.redirect(new URL('/staff/login', request.url))
        }
        if (pathname === '/staff/login' && staffSecret) {
            return NextResponse.redirect(new URL('/staff/dashboard', request.url))
        }
        return NextResponse.next()
    }

    // 3. User Routes Logic (Apply i18n prefixing)
    return intlMiddleware(request);
}

export const config = {
    // Match all pathnames except for
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /_static (inside /public)
    // - all root files inside /public (e.g. /favicon.ico)
    matcher: ['/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
